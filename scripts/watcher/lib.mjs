// Pure helpers for the daily watcher (no network here, so they're unit-tested).
// The network part is in watch.mjs.

const PK_PLACE = /pakistan|lahore|karachi|islamabad|rawalpindi|peshawar|faisalabad|multan|\bpk\b/i;
const REMOTE = /\b(remote|anywhere|worldwide|global)\b/i;
// Remote roles tied to another country or region aren't open to someone in Pakistan.
const OTHER_PLACE =
  /\b(united states|usa|u\.s\.|us|canada|united kingdom|uk|england|ireland|europe|eu|emea|americas|latam|north america|germany|france|spain|portugal|netherlands|poland|romania|india|uae|dubai|saudi|ksa|qatar|singapore|australia|new zealand|japan|brazil|mexico|austin|new york|san francisco|london|berlin|toronto)\b/i;

/** In Pakistan, or remote without being limited to another country. */
export function isPakistanOrRemote(location) {
  const l = String(location ?? "");
  if (PK_PLACE.test(l)) return true;
  return REMOTE.test(l) && !OTHER_PLACE.test(l);
}

const NOT_TECH = /\b(business develop(er|ment)|bd|management trainee|sales|marketing|account (executive|manager)|recruit(er|ment)|hr\b|human resources|finance|legal|graphic designer|content writer|seo)\b/i;
export const TECH_TITLE =
  /\b(engineer|engineering|developer|programmer|software|frontend|front-end|backend|back-end|full[- ]?stack|qa|sqa|test|tester|devops|data|ml|ai|mobile|android|ios|flutter|react|web|cloud|security|(ui|ux|product) designer|ui|ux|it)\b/i;

/** A software/IT role (not sales, HR, marketing or graphic design). */
export function isTechRole(title) {
  return TECH_TITLE.test(title) && !NOT_TECH.test(title);
}
export const CAREER_LINK = /(career|\bjobs?\b|join[-_ ]?(us|our)|hiring|vacanc|opportunit|work[-_ ]with[-_ ]us|open[-_ ]positions)/i;
export const SKIPPED_HOSTS = /(^|\.)(linkedin|facebook|fb|whatsapp|indeed|instagram|twitter|x|rozee)\.(com|pk)$/i;

/* ── robots.txt ─────────────────────────────────────────────── */

/** Rules that apply to us ("*" or an agent containing "radar"). */
export function parseRobots(text) {
  const rules = [];
  let applies = false;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      const match = value === "*" || value.toLowerCase().includes("radar");
      applies = lastWasAgent ? applies || match : match;
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (applies && (key === "allow" || key === "disallow") && value) rules.push({ allow: key === "allow", path: value });
    }
  }
  return rules;
}

/** Longest matching rule wins; on a tie, Allow wins. No rule = allowed. */
export function robotsAllows(rules, pathAndQuery) {
  let best = null;
  for (const rule of rules) {
    const pattern = "^" + rule.path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$");
    if (new RegExp(pattern).test(pathAndQuery) && (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow))) best = rule;
  }
  return !best || best.allow;
}

/* ── hiring platforms with public job feeds ─────────────────── */

const decode = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

/** HTML → plain text. Greenhouse escapes its HTML twice, so decode, drop tags, decode again. */
const strip = (html) =>
  decode(
    decode(String(html ?? ""))
      .replace(/<(br|\/p|\/li|\/h[1-6]|\/div)\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

export const MAX_DESCRIPTION = 4000;

export const PLATFORMS = [
  {
    name: "Greenhouse",
    find: /(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=)?([a-z0-9_-]+)|boards-api\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)|greenhouse\.io\/embed\/job_board\/js\?for=([a-z0-9_-]+)/i,
    feed: (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`,
    jobs: (d) =>
      (d.jobs ?? []).map((j) => ({ id: String(j.id), title: j.title, location: j.location?.name ?? "", url: j.absolute_url, postedAt: j.updated_at ?? null, description: strip(j.content) })),
  },
  {
    name: "Lever",
    find: /jobs\.lever\.co\/([a-z0-9_.-]+)/i,
    feed: (t) => `https://api.lever.co/v0/postings/${t}?mode=json`,
    jobs: (d) =>
      (Array.isArray(d) ? d : []).map((j) => ({
        id: j.id,
        title: j.text,
        location: [j.categories?.location, j.workplaceType].filter(Boolean).join(" · "),
        url: j.hostedUrl,
        postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
        description: [j.descriptionPlain, ...(j.lists ?? []).map((l) => `${l.text}\n${strip(l.content)}`), j.additionalPlain].filter(Boolean).join("\n"),
      })),
  },
  {
    name: "Ashby",
    find: /jobs\.ashbyhq\.com\/([a-z0-9_.-]+)/i,
    feed: (t) => `https://api.ashbyhq.com/posting-api/job-board/${t}`,
    jobs: (d) =>
      (d.jobs ?? []).map((j) => ({ id: j.id, title: j.title, location: [j.location, j.isRemote ? "Remote" : ""].filter(Boolean).join(" · "), url: j.jobUrl, postedAt: j.publishedAt ?? null, description: j.descriptionPlain ?? strip(j.descriptionHtml) })),
  },
  {
    name: "Workable",
    find: /apply\.workable\.com\/([a-z0-9_-]+)/i,
    feed: (t) => `https://apply.workable.com/api/v1/widget/accounts/${t}?details=true`,
    jobs: (d) =>
      (d.jobs ?? []).map((j) => ({
        id: j.shortcode ?? j.id ?? j.url,
        title: j.title,
        location: [j.city, j.country, j.telecommuting ? "Remote" : ""].filter(Boolean).join(" · "),
        url: j.application_url ?? j.url ?? j.shortlink,
        postedAt: j.published_on ?? j.created_at ?? null,
        description: strip(j.description),
      })),
  },
  {
    name: "SmartRecruiters",
    find: /(?:careers|jobs)\.smartrecruiters\.com\/([A-Za-z0-9_-]+)/,
    feed: (t) => `https://api.smartrecruiters.com/v1/companies/${t}/postings`,
    jobs: (d) =>
      (d.content ?? []).map((j) => ({ id: j.id, title: j.name, location: [j.location?.city, j.location?.country, j.location?.remote ? "Remote" : ""].filter(Boolean).join(" · "), url: j.ref ? `https://jobs.smartrecruiters.com/${j.company?.identifier}/${j.id}` : null, postedAt: j.releasedDate ?? null, description: "" })),
  },
  {
    name: "Recruitee",
    find: /([a-z0-9-]+)\.recruitee\.com/i,
    feed: (t) => `https://${t}.recruitee.com/api/offers/`,
    jobs: (d) =>
      (d.offers ?? []).map((j) => ({ id: String(j.id), title: j.title, location: [j.location, j.remote ? "Remote" : ""].filter(Boolean).join(" · "), url: j.careers_url, postedAt: j.published_at ?? null, description: strip(`${j.description ?? ""}\n${j.requirements ?? ""}`) })),
  },
  {
    name: "Breezy",
    find: /([a-z0-9-]+)\.breezy\.hr/i,
    feed: (t) => `https://${t}.breezy.hr/json`,
    jobs: (d) => (Array.isArray(d) ? d : []).map((j) => ({ id: j.id, title: j.name, location: j.location?.name ?? "", url: j.url, postedAt: j.published_date ?? null, description: "" })),
  },
];

const NOT_TOKENS = new Set(["embed", "www", "api", "jobs", "careers", "boards", "job-boards"]);

/** Finds a hiring platform link (and its board name) in some HTML or a URL. */
export function findPlatform(text) {
  for (const p of PLATFORMS) {
    const m = String(text).match(p.find);
    const token = m && (m[1] ?? m[2] ?? m[3]);
    if (token && !NOT_TOKENS.has(token.toLowerCase())) return { platform: p.name, token };
  }
  return null;
}

export function platformByName(name) {
  return PLATFORMS.find((p) => p.name === name) ?? null;
}

/** Keeps tech roles in Pakistan or remote; trims descriptions. */
export function relevantJobs(jobs) {
  return jobs
    .filter((j) => j.title && j.url && /^https?:\/\//.test(j.url) && isPakistanOrRemote(j.location) && isTechRole(j.title))
    .map((j) => ({ ...j, title: String(j.title).trim().slice(0, 160), location: String(j.location ?? "").trim().slice(0, 120), description: String(j.description ?? "").slice(0, MAX_DESCRIPTION) }));
}

/* ── careers pages ──────────────────────────────────────────── */

export function linksIn(html, base) {
  const out = [];
  for (const m of String(html).matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      out.push({ href: new URL(m[1], base).toString(), text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() });
    } catch {
      /* not a URL */
    }
  }
  return out;
}

export function iframesIn(html, base) {
  const out = [];
  for (const m of String(html).matchAll(/<iframe\b[^>]*src\s*=\s*["']([^"']+)["']/gi)) {
    try {
      out.push(new URL(m[1], base).toString());
    } catch {
      /* not a URL */
    }
  }
  return out;
}

/** Visible text lines of a page, without scripts, styles, nav or footer. */
export function textLines(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<(nav|footer|header)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(h[1-6]|li|p|div|a|td|tr|span|button|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * A fingerprint of the page's meaningful text, so cosmetic changes don't
 * count as "page changed" (REQ-021): dates, years, counters and copyright
 * lines are removed before hashing.
 */
export function fingerprintText(lines) {
  return lines
    .filter((l) => !/©|copyright|all rights reserved|cookie/i.test(l))
    .map((l) =>
      l
        .toLowerCase()
        .replace(/\b(19|20)\d{2}\b/g, "")
        .replace(/\b\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?\b/g, "")
        .replace(/\b\d+\s*(days?|hours?|minutes?|weeks?)\s+ago\b/g, "")
        .replace(/\d+/g, "#")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((l) => l.length > 2)
    .join("\n");
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

const ROLE = /\b(intern(ship)?|trainee|engineer|developer|designer|analyst|associate|qa|sqa|devops|architect|programmer|scientist|specialist|lead|consultant|tester)\b/i;
const NOISE = /(apply now|view (all|details)|read more|learn more|our team|privacy|subscribe|contact|blog|case stud|services|solutions|industries|about us|login|sign in|talk to|we (are|build|help)|excellence|recognition)/i;

/** Lines that look like job titles (a hint shown with "page changed"; not trusted as openings). */
export function possibleRoles(lines) {
  const seen = new Map();
  for (const l of lines) {
    if (l.length < 6 || l.length > 70 || !ROLE.test(l) || NOISE.test(l) || /[.!?:]$/.test(l) || l.split(" ").length > 8) continue;
    const key = l.toLowerCase();
    if (!seen.has(key)) seen.set(key, l);
  }
  return [...seen.values()].slice(0, 12);
}

export function hiringEmails(html) {
  const out = new Set();
  for (const m of String(html).matchAll(/\b(careers?|jobs?|hr|hiring|recruit(?:ment|ing)?|talent|people)@[a-z0-9.-]+\.[a-z]{2,}\b/gi)) out.add(m[0].toLowerCase());
  return [...out].slice(0, 3);
}

/** Job ads posted only as images (REQ-024): an <img> whose alt or file name says hiring. */
export function hasImageAd(html) {
  return /<img\b[^>]*(alt|src)\s*=\s*["'][^"']*(hiring|vacanc|we-?are-?hiring|job-?post|opening)[^"']*["']/i.test(String(html));
}
