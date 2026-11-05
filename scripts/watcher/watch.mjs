// Daily watcher (runs on GitHub Actions; see .github/workflows/watch.yml).
//
// For every company in data/companies.json it:
//   1. respects robots.txt and identifies itself honestly;
//   2. finds the careers page and any hiring platform with a public job feed;
//   3. reads openings from that feed (tech roles in Pakistan or remote), or,
//      for a plain careers page, notices when the page changes;
//   4. writes public/feed/openings.json and public/feed/companies.json,
//      which the website reads.
//
// One company failing never stops the others, and if the run crashes the
// companies already checked are still saved (PRD §4, §7).
// Run locally: node scripts/watcher/watch.mjs   (Node 22+, no dependencies)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  CAREER_LINK,
  SKIPPED_HOSTS,
  findPlatform,
  fingerprintText,
  hasImageAd,
  hiringEmails,
  iframesIn,
  linksIn,
  parseRobots,
  platformByName,
  possibleRoles,
  relevantJobs,
  robotsAllows,
  sha256,
  textLines,
} from "./lib.mjs";

const ROOT = new URL("../../", import.meta.url);
const OUT = new URL("public/feed/", ROOT);
const UA = "RadarWatcher/1.0 (student project; checks careers pages once a day; +https://github.com/TechnicalSamia18/radar-frontend)";
const TIMEOUT = 15_000;
const PAUSE = Number(process.env.WATCH_PAUSE ?? 1_500); // between requests to the same site
const PARALLEL_SITES = 5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = new Date().toISOString();

async function get(url, accept = "text/html,application/xhtml+xml") {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept }, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT) });
    const body = res.ok ? (await res.text()).slice(0, 3_000_000) : "";
    return { ok: res.ok, status: res.status, url: res.url, type: res.headers.get("content-type") ?? "", body };
  } catch (e) {
    return { ok: false, status: 0, url, type: "", body: "", error: e.name === "TimeoutError" ? "timeout" : (e.cause?.code ?? e.message) };
  }
}

const robotsCache = new Map();
async function allowed(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.origin)) {
    const r = await get(`${u.origin}/robots.txt`, "text/plain");
    // Missing robots.txt (404) = no rules. Server error (5xx) = can't tell, so stay away today.
    // No answer at all = the site is down; the page request will fail and say so.
    robotsCache.set(u.origin, r.ok ? parseRobots(r.body) : r.status >= 500 ? null : []);
    await sleep(PAUSE);
  }
  const rules = robotsCache.get(u.origin);
  return rules !== null && robotsAllows(rules, u.pathname + u.search);
}

async function politeGet(url) {
  if (!(await allowed(url))) return { ok: false, blocked: true, url, body: "" };
  const r = await get(url);
  await sleep(PAUSE);
  return r;
}

async function readFeed(platformName, token) {
  const p = platformByName(platformName);
  const r = await get(p.feed(token), "application/json");
  await sleep(PAUSE);
  if (!r.ok) return { ok: false, error: `feed ${r.status || r.error}` };
  try {
    return { ok: true, jobs: relevantJobs(p.jobs(JSON.parse(r.body))) };
  } catch {
    return { ok: false, error: "feed was not valid JSON" };
  }
}

const sameSite = (a, b) => {
  const h = (u) => new URL(u).hostname.replace(/^www\./, "");
  return h(a) === h(b) || h(a).endsWith("." + h(b)) || h(b).endsWith("." + h(a));
};

/** Checks one company. Never throws. */
async function checkCompany(company, previous) {
  const base = {
    name: company.name,
    city: company.city ?? null,
    website: company.website,
    careersUrl: company.careersUrl ?? previous?.careersUrl ?? null,
    platform: null,
    source: "nothing_found",
    openings: 0,
    emails: previous?.emails ?? [],
    pageHash: previous?.pageHash ?? null,
    pageChangedAt: previous?.pageChangedAt ?? null,
    possibleRoles: previous?.possibleRoles ?? [],
    imageAd: false,
    lastChecked: now,
    failures: 0,
    note: null,
  };
  const jobs = [];
  // Every return is { company, jobs }; a failure adds one to the consecutive-failure count.
  const failed = (source, note) => ({ company: { ...base, source, note, failures: (previous?.failures ?? 0) + 1 }, jobs: [] });

  try {
    // 1. A board set by hand in companies.json wins (like the "use my link" override).
    let hit = company.feed ? { platform: company.feed.platform, token: company.feed.token } : null;
    let careers = null;

    if (!hit) {
      const start = company.careersUrl ?? company.website;
      const home = await politeGet(start);
      if (home.blocked) return failed("blocked", "robots.txt asks automated tools not to visit");
      if (!home.ok) return failed("unreachable", `Couldn't reach the site (${home.status || home.error})`);

      hit = findPlatform(home.body);
      if (!hit && company.careersUrl) careers = home;

      // 2. Find the careers page from the homepage, or try the usual paths.
      if (!hit && !careers) {
        const origin = new URL(home.url).origin;
        const linked = linksIn(home.body, home.url)
          .filter((l) => (CAREER_LINK.test(l.href) || CAREER_LINK.test(l.text)) && !SKIPPED_HOSTS.test(new URL(l.href).hostname))
          .map((l) => l.href);
        const tries = [...new Set([...linked.slice(0, 3), `${origin}/careers`, `${origin}/jobs`])].slice(0, 4);
        for (const url of tries) {
          hit = findPlatform(url);
          if (hit) break;
          if (!sameSite(url, origin)) continue;
          const page = await politeGet(url);
          if (page.blocked) {
            base.note = "robots.txt asks automated tools not to visit the careers page";
            continue;
          }
          if (page.ok && /html/.test(page.type)) {
            careers = page;
            break;
          }
        }
        if (!hit) base.emails = hiringEmails(home.body);
      }

      // 3. A hiring platform linked or embedded (iframe) on the careers page.
      if (!hit && careers) {
        base.careersUrl = careers.url;
        hit = findPlatform(careers.body) ?? iframesIn(careers.body, careers.url).map(findPlatform).find(Boolean) ?? null;
      }
    }

    // 4a. Public feed → real openings.
    if (hit) {
      const feed = await readFeed(hit.platform, hit.token);
      base.platform = hit.platform;
      if (!feed.ok) return failed("unreachable", `${hit.platform} board "${hit.token}": ${feed.error}`);
      for (const j of feed.jobs) jobs.push({ ...j, id: `${hit.platform.toLowerCase()}:${hit.token}:${j.id}` });
      return { company: { ...base, source: "feed", openings: jobs.length, note: `${hit.platform} board "${hit.token}"` }, jobs };
    }

    // 4b. Plain careers page → watch for changes.
    if (careers) {
      const lines = textLines(careers.body);
      const hash = await sha256(fingerprintText(lines));
      const emails = [...new Set([...base.emails, ...hiringEmails(careers.body)])].slice(0, 3);
      const changed = base.pageHash !== null && base.pageHash !== hash;
      return {
        company: {
          ...base,
          source: "careers_page",
          emails,
          pageHash: hash,
          pageChangedAt: changed ? now : base.pageChangedAt,
          possibleRoles: possibleRoles(lines),
          imageAd: hasImageAd(careers.body),
          note: lines.length < 15 ? "This page may load its jobs with JavaScript; open it to check." : base.note,
        },
        jobs,
      };
    }

    return { company: { ...base, source: base.emails.length ? "email_only" : "nothing_found" }, jobs };
  } catch (e) {
    return failed("unreachable", `Check failed: ${e.message}`);
  }
}

/* ── run ───────────────────────────────────────────────────── */

async function readJson(url, fallback) {
  try {
    return JSON.parse(await readFile(url, "utf8"));
  } catch {
    return fallback;
  }
}

const companies = await readJson(new URL("data/companies.json", ROOT), []);
const prevCompanies = await readJson(new URL("companies.json", OUT), { companies: [] });
const prevOpenings = await readJson(new URL("openings.json", OUT), { items: [] });
const prevByName = new Map(prevCompanies.companies.map((c) => [c.name, c]));
const firstSeen = new Map(prevOpenings.items.map((o) => [o.id, o.firstSeen]));

const results = new Map(); // name → { company, jobs }
async function save(final) {
  // Companies not checked in this run (e.g. after a crash) keep yesterday's entry and openings.
  const outCompanies = companies.map((c) => results.get(c.name)?.company ?? prevByName.get(c.name)).filter(Boolean);
  const items = [];
  for (const c of companies) {
    const r = results.get(c.name);
    const jobs = r ? r.jobs : prevOpenings.items.filter((o) => o.companyName === c.name);
    for (const j of jobs) {
      items.push({
        id: j.id,
        companyName: c.name,
        companyCity: c.city ?? null,
        title: j.title,
        location: j.location,
        url: j.url,
        postedAt: j.postedAt ?? null,
        firstSeen: firstSeen.get(j.id) ?? j.firstSeen ?? now,
        description: j.description ?? "",
        source: j.source ?? results.get(c.name)?.company.platform ?? "feed",
      });
    }
  }
  await mkdir(OUT, { recursive: true });
  await writeFile(new URL("companies.json", OUT), JSON.stringify({ generatedAt: now, complete: final, companies: outCompanies }, null, 2) + "\n");
  await writeFile(new URL("openings.json", OUT), JSON.stringify({ generatedAt: now, complete: final, items }, null, 2) + "\n");
  return { companies: outCompanies.length, openings: items.length };
}

let next = 0;
try {
  await Promise.all(
    Array.from({ length: PARALLEL_SITES }, async () => {
      while (next < companies.length) {
        const c = companies[next++];
        const r = await checkCompany(c, prevByName.get(c.name));
        results.set(c.name, r);
        const co = r.company;
        console.log(`${co.source.padEnd(13)} ${String(co.openings).padStart(3)}  ${c.name}${co.note ? `  (${co.note})` : ""}`);
      }
    }),
  );
} finally {
  const totals = await save(results.size === companies.length);
  console.log(`\nSaved ${totals.companies} companies and ${totals.openings} openings (${results.size}/${companies.length} checked this run).`);
}
