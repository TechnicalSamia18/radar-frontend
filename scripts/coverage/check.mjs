// Coverage check (one-off): for each company in companies.json, can Radar
// find real openings automatically, for free?
//
// Rules: honest user agent, robots.txt respected (skip if disallowed), one
// request at a time per site with a pause, 15 s timeout, no logins, no
// LinkedIn/Facebook/WhatsApp/Indeed. Hiring-platform jobs come from their
// official public JSON feeds.
//
// Run: node scripts/coverage/check.mjs  (Node 22+, no dependencies)
import { readFile, writeFile, mkdir } from "node:fs/promises";

const UA = "RadarCoverageCheck/0.1 (student project; +https://github.com/TechnicalSamia18/radar-frontend)";
const TIMEOUT = 15_000;
const PAUSE = 1_200;
const PK = /pakistan|lahore|karachi|islamabad|rawalpindi|peshawar|faisalabad|multan|\bremote\b|anywhere/i;
const ENTRY = /\b(intern(ship)?|trainee|junior|jr\.?|associate|graduate|entry[- ]level|fresh)/i;
const TECH = /\b(engineer|developer|programmer|software|frontend|front-end|backend|back-end|full[- ]?stack|qa|sqa|test|devops|data|ml|ai|mobile|android|ios|web|cloud|security|designer|ui|ux)\b/i;
const CAREER_LINK = /(career|\bjobs?\b|join[-_ ]?(us|our)|hiring|vacanc|opportunit|work[-_ ]with[-_ ]us|open[-_ ]positions)/i;
const BLOCKED_HOSTS = /(linkedin|facebook|fb\.com|whatsapp|indeed|instagram|twitter|x\.com|rozee)\./i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, accept = "text/html,application/json") {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept }, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT) });
    const type = res.headers.get("content-type") ?? "";
    const body = res.ok ? (await res.text()).slice(0, 3_000_000) : "";
    return { ok: res.ok, status: res.status, url: res.url, type, body };
  } catch (e) {
    return { ok: false, status: 0, url, type: "", body: "", error: e.name === "TimeoutError" ? "timeout" : e.cause?.code ?? e.message };
  }
}

async function getJson(url) {
  const r = await get(url, "application/json");
  if (!r.ok) return { ok: false, status: r.status, error: r.error };
  try {
    return { ok: true, data: JSON.parse(r.body) };
  } catch {
    return { ok: false, status: r.status, error: "not JSON" };
  }
}

/* ── robots.txt (longest matching rule wins; Allow beats Disallow on ties) ── */
const robotsCache = new Map();
async function robotsAllows(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.origin)) {
    const r = await get(`${u.origin}/robots.txt`, "text/plain");
    const rules = [];
    if (r.ok) {
      let applies = false;
      let lastWasAgent = false;
      for (const raw of r.body.split(/\r?\n/)) {
        const line = raw.replace(/#.*/, "").trim();
        const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
        if (!m) continue;
        const [, key, value] = m;
        if (key.toLowerCase() === "user-agent") {
          const agent = value.toLowerCase();
          const match = agent === "*" || agent.includes("radar");
          applies = lastWasAgent ? applies || match : match;
          lastWasAgent = true;
        } else {
          lastWasAgent = false;
          if (applies && /^(dis)?allow$/i.test(key) && value) rules.push({ allow: key.toLowerCase() === "allow", path: value });
        }
      }
    }
    robotsCache.set(u.origin, rules);
    await sleep(PAUSE);
  }
  const path = u.pathname + u.search;
  let best = null;
  for (const rule of robotsCache.get(u.origin)) {
    const re = new RegExp("^" + rule.path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
    if (re.test(path) && (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow))) best = rule;
  }
  return !best || best.allow;
}

async function politeGet(url) {
  if (!(await robotsAllows(url))) return { ok: false, status: 0, url, body: "", blockedByRobots: true };
  const r = await get(url);
  await sleep(PAUSE);
  return r;
}

/* ── hiring platforms with public feeds ── */
const PLATFORMS = [
  {
    name: "Greenhouse",
    find: /(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=)?([a-z0-9_-]+)|boards-api\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)|greenhouse\.io\/embed\/job_board\/js\?for=([a-z0-9_-]+)/i,
    feed: (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs`,
    jobs: (d) => (d.jobs ?? []).map((j) => ({ title: j.title, location: j.location?.name ?? "" })),
  },
  {
    name: "Lever",
    find: /jobs\.lever\.co\/([a-z0-9_.-]+)/i,
    feed: (t) => `https://api.lever.co/v0/postings/${t}?mode=json`,
    jobs: (d) => (Array.isArray(d) ? d : []).map((j) => ({ title: j.text, location: [j.categories?.location, j.workplaceType].filter(Boolean).join(" ") })),
  },
  {
    name: "Ashby",
    find: /jobs\.ashbyhq\.com\/([a-z0-9_.-]+)/i,
    feed: (t) => `https://api.ashbyhq.com/posting-api/job-board/${t}`,
    jobs: (d) => (d.jobs ?? []).map((j) => ({ title: j.title, location: [j.location, j.isRemote ? "remote" : ""].join(" ") })),
  },
  {
    name: "Workable",
    find: /apply\.workable\.com\/([a-z0-9_-]+)/i,
    feed: (t) => `https://apply.workable.com/api/v1/widget/accounts/${t}`,
    jobs: (d) => (d.jobs ?? []).map((j) => ({ title: j.title, location: [j.city, j.country, j.telecommuting ? "remote" : ""].join(" ") })),
  },
  {
    name: "SmartRecruiters",
    find: /(?:careers|jobs)\.smartrecruiters\.com\/([A-Za-z0-9_-]+)/,
    feed: (t) => `https://api.smartrecruiters.com/v1/companies/${t}/postings`,
    jobs: (d) => (d.content ?? []).map((j) => ({ title: j.name, location: [j.location?.city, j.location?.country, j.location?.remote ? "remote" : ""].join(" ") })),
  },
  {
    name: "Recruitee",
    find: /([a-z0-9-]+)\.recruitee\.com/i,
    feed: (t) => `https://${t}.recruitee.com/api/offers/`,
    jobs: (d) => (d.offers ?? []).map((j) => ({ title: j.title, location: [j.location, j.remote ? "remote" : ""].join(" ") })),
  },
  {
    name: "Breezy",
    find: /([a-z0-9-]+)\.breezy\.hr/i,
    feed: (t) => `https://${t}.breezy.hr/json`,
    jobs: (d) => (Array.isArray(d) ? d : []).map((j) => ({ title: j.name, location: j.location?.name ?? "" })),
  },
  {
    name: "BambooHR",
    find: /([a-z0-9-]+)\.bamboohr\.com/i,
    feed: (t) => `https://${t}.bamboohr.com/careers/list`,
    jobs: (d) => (d.result ?? []).map((j) => ({ title: j.jobOpeningName, location: [j.location?.city, j.location?.state, j.isRemote ? "remote" : ""].join(" ") })),
  },
];
const OTHER_PLATFORMS = /(zohorecruit|recruit\.zoho|jobvite|icims|teamtailor|personio|workday|myworkdayjobs|bayt\.com|mustakbil|freshteam|keka\.com|darwinbox|successfactors|taleo|ziprecruiter|hirehive|jazzhr|applytojob)/i;

function findPlatform(html) {
  for (const p of PLATFORMS) {
    const m = html.match(p.find);
    const token = m && (m[1] ?? m[2] ?? m[3]);
    if (token && !["embed", "www", "api", "jobs", "careers"].includes(token.toLowerCase())) return { platform: p, token };
  }
  return null;
}

/* ── careers page parsing (rough, for counting only) ── */
function links(html, base) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      out.push({ href: new URL(m[1], base).toString(), text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() });
    } catch {}
  }
  return out;
}

function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(h[1-6]|li|p|div|a|td|tr|span|button)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;|&rsquo;/g, "'")
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
}

const ROLE = /\b(intern(ship)?|trainee|engineer|developer|designer|analyst|associate|qa|sqa|devops|architect|programmer|scientist|specialist|lead|manager|consultant|executive|officer|tester)\b/i;
const NOISE = /(apply now|view (all|details)|read more|learn more|our team|cookie|privacy|©|copyright|subscribe|contact us|blog|case stud|services|solutions|industries|about us|login|sign in)/i;

function candidateTitles(lines) {
  const seen = new Set();
  for (const l of lines) {
    if (l.length < 6 || l.length > 80 || !ROLE.test(l) || NOISE.test(l) || /[.!?]$/.test(l) || l.split(" ").length > 9) continue;
    seen.add(l.toLowerCase());
  }
  return [...seen];
}

const EMAIL = /\b(careers?|jobs?|hr|hiring|recruit(ment|ing)?|talent|people)@[a-z0-9.-]+\.[a-z]{2,}\b/gi;

/* ── one company ── */
async function check(company) {
  const r = { name: company.name, city: company.city, website: company.website, reachable: false, robots: "ok", careersUrl: null, platform: null, platformOther: null, feedOk: null, jobs: 0, pkJobs: 0, pkTech: 0, pkEntry: 0, pageTitles: 0, emails: [], examples: [], note: "" };

  const home = await politeGet(company.website);
  if (home.blockedByRobots) return { ...r, robots: "home disallowed", note: "robots.txt disallows the homepage" };
  if (!home.ok) return { ...r, note: `homepage ${home.status || home.error}` };
  r.reachable = true;

  let pages = [{ url: home.url, html: home.body }];
  let hit = findPlatform(home.body);

  // careers page: a link that looks like careers, else common paths
  if (!hit) {
    const origin = new URL(home.url).origin;
    const candidates = links(home.body, home.url)
      .filter((l) => (CAREER_LINK.test(l.href) || CAREER_LINK.test(l.text)) && !BLOCKED_HOSTS.test(l.href))
      .map((l) => l.href);
    const tries = [...new Set([...candidates.slice(0, 3), `${origin}/careers`, `${origin}/jobs`])].slice(0, 4);
    for (const url of tries) {
      const host = new URL(url).hostname;
      // platform link straight from the homepage
      const direct = findPlatform(url);
      if (direct) {
        hit = direct;
        r.careersUrl = url;
        break;
      }
      if (host !== new URL(origin).hostname && !host.endsWith("." + new URL(origin).hostname.replace(/^www\./, ""))) continue;
      const page = await politeGet(url);
      if (page.blockedByRobots) {
        r.robots = "careers disallowed";
        continue;
      }
      if (!page.ok || !/html/.test(page.type)) continue;
      r.careersUrl = page.url;
      pages.push({ url: page.url, html: page.body });
      hit = findPlatform(page.body);
      if (!hit && OTHER_PLATFORMS.test(page.body)) r.platformOther = page.body.match(OTHER_PLATFORMS)[1];
      break;
    }
  }

  for (const p of pages) for (const e of p.html.match(EMAIL) ?? []) if (!r.emails.includes(e.toLowerCase())) r.emails.push(e.toLowerCase());

  if (hit) {
    r.platform = hit.platform.name;
    const feed = await getJson(hit.platform.feed(hit.token));
    await sleep(PAUSE);
    r.feedOk = feed.ok;
    if (feed.ok) {
      const jobs = hit.platform.jobs(feed.data).filter((j) => j.title);
      const pk = jobs.filter((j) => PK.test(j.location ?? ""));
      r.jobs = jobs.length;
      r.pkJobs = pk.length;
      r.pkTech = pk.filter((j) => TECH.test(j.title)).length;
      r.pkEntry = pk.filter((j) => TECH.test(j.title) && ENTRY.test(j.title)).length;
      r.examples = pk.filter((j) => TECH.test(j.title)).slice(0, 3).map((j) => `${j.title} (${j.location.trim()})`);
    } else r.note = `feed ${feed.status || feed.error}`;
  } else if (r.careersUrl) {
    const careers = pages[pages.length - 1];
    const titles = candidateTitles(textOf(careers.html));
    r.pageTitles = titles.length;
    r.examples = titles.slice(0, 3);
    if (titles.length === 0) {
      if (/<iframe/i.test(careers.html)) r.note = "careers page uses an iframe";
      else if (careers.html.length < 15_000 || /__NEXT_DATA__|id="root"|ng-app|data-reactroot/i.test(careers.html)) r.note = "page may load jobs with JavaScript";
    }
  } else r.note = "no careers page found";
  return r;
}

/* ── run with a few sites at a time (each site is still one request at a time) ── */
const companies = JSON.parse(await readFile(new URL("./companies.json", import.meta.url), "utf8"));
const results = new Array(companies.length);
let next = 0;
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (next < companies.length) {
      const i = next++;
      results[i] = await check(companies[i]).catch((e) => ({ name: companies[i].name, city: companies[i].city, website: companies[i].website, reachable: false, note: `error: ${e.message}` }));
      console.error(`checked ${results[i].name}: ${results[i].platform ?? (results[i].careersUrl ? "careers page" : results[i].note)}`);
    }
  }),
);

/* ── summary ── */
const n = results.length;
const count = (f) => results.filter(f).length;
const sum = (k) => results.reduce((a, r) => a + (r[k] ?? 0), 0);
const lines = [];
lines.push(`# Coverage check — ${new Date().toISOString().slice(0, 10)}`, "");
lines.push(`Companies checked: **${n}**`, "");
lines.push("| Result | Companies |", "|---|---|");
lines.push(`| Website reachable | ${count((r) => r.reachable)} |`);
lines.push(`| Blocked by robots.txt (skipped) | ${count((r) => r.robots && r.robots !== "ok")} |`);
lines.push(`| Hiring platform with a public feed | ${count((r) => r.platform)} (${[...new Set(results.map((r) => r.platform).filter(Boolean))].join(", ") || "none"}) |`);
lines.push(`| …feed actually readable | ${count((r) => r.feedOk)} |`);
lines.push(`| Other hiring platform (no public feed) | ${count((r) => r.platformOther)} |`);
lines.push(`| Careers page found (no platform) | ${count((r) => r.careersUrl && !r.platform)} |`);
lines.push(`| …with job titles readable in the HTML | ${count((r) => !r.platform && r.pageTitles > 0)} |`);
lines.push(`| Hiring email found | ${count((r) => r.emails?.length)} |`);
lines.push(`| Nothing usable | ${count((r) => !r.feedOk && !(r.pageTitles > 0) && !r.emails?.length)} |`, "");
lines.push(`Openings from public feeds: **${sum("jobs")}** total, **${sum("pkJobs")}** in Pakistan or remote, **${sum("pkTech")}** tech roles, **${sum("pkEntry")}** intern/junior/associate tech roles.`);
lines.push(`Possible job titles on plain careers pages: **${sum("pageTitles")}** (rough count; needs checking).`, "");
lines.push("| Company | City | Source | Openings (PK/remote tech) | Entry-level | Emails | Notes / examples |", "|---|---|---|---|---|---|---|");
for (const r of results) {
  const source = r.platform ? `${r.platform}${r.feedOk ? "" : " (feed failed)"}` : r.platformOther ? `${r.platformOther} (no feed)` : r.careersUrl ? "careers page" : r.reachable ? "—" : "unreachable";
  const openings = r.platform ? `${r.pkTech ?? 0} of ${r.jobs ?? 0}` : r.pageTitles ? `~${r.pageTitles} titles` : "—";
  lines.push(`| ${r.name} | ${r.city} | ${source} | ${openings} | ${r.pkEntry ?? "—"} | ${(r.emails ?? []).join(" ") || "—"} | ${[r.note, ...(r.examples ?? [])].filter(Boolean).join("; ").replace(/\|/g, "/") || "—"} |`);
}
const md = lines.join("\n") + "\n";
await mkdir(new URL("../../docs/coverage/", import.meta.url), { recursive: true });
await writeFile(new URL("../../docs/coverage/results.md", import.meta.url), md);
await writeFile(new URL("../../docs/coverage/results.json", import.meta.url), JSON.stringify(results, null, 2));
console.log(md);
