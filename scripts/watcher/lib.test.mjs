import { describe, expect, it } from "vitest";
import {
  findPlatform,
  fingerprintText,
  hasImageAd,
  hiringEmails,
  isPakistanOrRemote,
  isTechRole,
  iframesIn,
  parseRobots,
  platformByName,
  possibleRoles,
  relevantJobs,
  robotsAllows,
  sha256,
  textLines,
} from "./lib.mjs";

describe("robots.txt", () => {
  const rules = parseRobots(`
User-agent: Googlebot
Disallow: /

User-agent: *
Disallow: /admin
Disallow: /careers/private
Allow: /careers/private/open
Disallow: /*.pdf$
`);
  it("only uses the rules for * (not other bots)", () => {
    expect(robotsAllows(rules, "/")).toBe(true);
    expect(robotsAllows(rules, "/careers")).toBe(true);
  });
  it("blocks disallowed paths, longest rule wins, Allow wins ties", () => {
    expect(robotsAllows(rules, "/admin/x")).toBe(false);
    expect(robotsAllows(rules, "/careers/private/x")).toBe(false);
    expect(robotsAllows(rules, "/careers/private/open")).toBe(true);
    expect(robotsAllows(rules, "/files/a.pdf")).toBe(false);
  });
  it("treats an empty or missing robots.txt as allowed", () => {
    expect(robotsAllows(parseRobots(""), "/careers")).toBe(true);
  });
  it("honours a full block", () => {
    expect(robotsAllows(parseRobots("User-agent: *\nDisallow: /"), "/careers")).toBe(false);
  });
});

describe("findPlatform", () => {
  it("recognises the public-feed platforms", () => {
    expect(findPlatform('<a href="https://boards.greenhouse.io/motive">')).toEqual({ platform: "Greenhouse", token: "motive" });
    expect(findPlatform("https://job-boards.greenhouse.io/embed/job_board?for=acme")).toEqual({ platform: "Greenhouse", token: "acme" });
    expect(findPlatform("https://jobs.lever.co/educative")).toEqual({ platform: "Lever", token: "educative" });
    expect(findPlatform("https://apply.workable.com/devsinc/")).toEqual({ platform: "Workable", token: "devsinc" });
    expect(findPlatform("https://jobs.ashbyhq.com/safepay")).toEqual({ platform: "Ashby", token: "safepay" });
  });
  it("ignores generic words that aren't board names", () => {
    expect(findPlatform("https://boards.greenhouse.io/embed")).toBeNull();
    expect(findPlatform("<p>no platform here</p>")).toBeNull();
  });
});

describe("feed parsing", () => {
  it("reads a Greenhouse feed and keeps Pakistani/remote tech roles", () => {
    const gh = platformByName("Greenhouse");
    const jobs = gh.jobs({
      jobs: [
        { id: 1, title: "Software Engineer", location: { name: "Lahore, Pakistan" }, absolute_url: "https://boards.greenhouse.io/x/jobs/1", content: "&lt;p&gt;React &amp;amp; Node&lt;/p&gt;" },
        { id: 2, title: "Account Executive", location: { name: "Karachi" }, absolute_url: "https://x/2" },
        { id: 3, title: "Backend Engineer", location: { name: "Berlin" }, absolute_url: "https://x/3" },
        { id: 4, title: "Data Analyst", location: { name: "Pakistan - Remote" }, absolute_url: "javascript:alert(1)" },
      ],
    });
    const kept = relevantJobs(jobs);
    expect(kept.map((j) => j.id)).toEqual(["1"]);
    expect(kept[0].description).toBe("React & Node");
  });

  it("reads Lever and Workable shapes", () => {
    const lever = platformByName("Lever").jobs([{ id: "a", text: "Software Engineer (Entry-level)", categories: { location: "Lahore" }, workplaceType: "onsite", hostedUrl: "https://jobs.lever.co/e/a", descriptionPlain: "Python" }]);
    expect(relevantJobs(lever)[0]).toMatchObject({ title: "Software Engineer (Entry-level)", location: "Lahore · onsite" });
    const workable = platformByName("Workable").jobs({ jobs: [{ shortcode: "S1", title: "Associate Software Engineer", city: "Lahore", country: "Pakistan", url: "https://apply.workable.com/d/j/S1" }] });
    expect(relevantJobs(workable)[0].id).toBe("S1");
  });
});

describe("careers pages", () => {
  const html = `<html><head><style>.a{}</style></head><body>
    <nav><a href="/">Home</a><a href="/careers">Careers</a></nav>
    <h1>Join our team</h1>
    <h3>Frontend Developer</h3><p>Lahore · Full time</p>
    <h3>QA Intern</h3>
    <p>We build great software for clients.</p>
    <a href="mailto:careers@acme.pk">careers@acme.pk</a>
    <iframe src="https://apply.workable.com/acme/"></iframe>
    <footer>© 2026 Acme. Updated 3 days ago</footer>
  </body></html>`;

  it("pulls visible text without nav, footer and styles", () => {
    const lines = textLines(html);
    expect(lines).toContain("Frontend Developer");
    expect(lines.join(" ")).not.toMatch(/© 2026|\.a\{\}/);
  });
  it("suggests possible roles but not marketing sentences", () => {
    expect(possibleRoles(textLines(html))).toEqual(["Frontend Developer", "QA Intern"]);
  });
  it("finds hiring emails and iframes", () => {
    expect(hiringEmails(html)).toEqual(["careers@acme.pk"]);
    expect(iframesIn(html, "https://acme.pk/careers")).toEqual(["https://apply.workable.com/acme/"]);
  });
  it("detects image-only job ads", () => {
    expect(hasImageAd('<img src="/uploads/we-are-hiring-oct.jpg">')).toBe(true);
    expect(hasImageAd('<img src="/logo.png" alt="Acme">')).toBe(false);
  });
});

describe("change detection (REQ-021)", () => {
  it("ignores dates, years, counters and copyright lines", async () => {
    const a = fingerprintText(["Frontend Developer", "Posted 3 days ago", "Apply by 20/11/2026", "© 2026 Acme"]);
    const b = fingerprintText(["Frontend Developer", "Posted 5 days ago", "Apply by 25/11/2026", "© 2027 Acme"]);
    expect(await sha256(a)).toBe(await sha256(b));
  });
  it("notices a new role", async () => {
    const a = fingerprintText(["Frontend Developer"]);
    const b = fingerprintText(["Frontend Developer", "Backend Developer"]);
    expect(await sha256(a)).not.toBe(await sha256(b));
  });
});

describe("relevance filters", () => {
  it("keeps Pakistan and open remote roles, drops remote roles tied to other countries", () => {
    for (const ok of ["Lahore · Pakistan", "Islamabad", "Pakistan - Remote", "Remote", "Anywhere", "Hybrid - Islamabad & Lahore"]) expect(isPakistanOrRemote(ok), ok).toBe(true);
    for (const no of ["United States - Remote", "Canada - Remote", "Remote - EMEA", "Berlin", "London (Remote)", ""]) expect(isPakistanOrRemote(no), no).toBe(false);
  });
  it("keeps software roles, drops business development, sales and graphic design", () => {
    for (const ok of ["Associate Software Engineer- MERN", "Software Engineer -Frontend", "QA Intern", "Product Designer", "Data Analyst II", "DevOps Engineer"]) expect(isTechRole(ok), ok).toBe(true);
    for (const no of ["Associate Business Developer", "Senior Graphic Designer", "Account Executive", "Marketing Lead", "Technical Recruiter", "BD Coordination Intern", "Management Trainee Officer"]) expect(isTechRole(no), no).toBe(false);
  });
});
