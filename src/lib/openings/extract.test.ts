import { describe, expect, it } from "vitest";
import { extractOpening, todayPk } from "./extract";

// Fixed "now": Wednesday 4 Nov 2026, noon in Pakistan.
const NOW = new Date("2026-11-04T12:00:00+05:00");

const INTERNSHIP_POST = `
🚀 We're Hiring: Frontend Intern (React)
Nimbus Labs, Lahore — Hybrid, paid internship

Requirements:
- Good grip on React, JavaScript and Git
- TypeScript is a plus
- Final year students or fresh graduates, CGPA 3.0 or above

Apply by 20th Nov. Send your CV to careers@nimbuslabs.pk
More info: https://nimbuslabs.pk/careers/frontend-intern
`;

const JOB_POST = `
Job Title: Associate Software Engineer
Kestrel Systems | Islamabad | Onsite | Full-time
We are looking for graduates only (BS CS/SE, completed degree).
1-2 years of experience with Node.js, PostgreSQL and Docker.
Last date to apply: 30/11/2026
Apply here: https://kestrel.pk/jobs/ase?ref=board.
`;

describe("extractOpening — a typical internship post", () => {
  const o = extractOpening(INTERNSHIP_POST, NOW);

  it("finds the title without the 'We're hiring' prefix or emoji", () => {
    expect(o.title).toBe("Frontend Intern (React)");
  });
  it("finds type, city and work mode", () => {
    expect(o).toMatchObject({ type: "internship", location: "Lahore", workMode: "hybrid" });
  });
  it("finds skills", () => {
    expect(o.skills).toEqual(expect.arrayContaining(["JavaScript", "TypeScript", "React", "Git"]));
  });
  it("reads '20th Nov' as 20 Nov this year", () => {
    expect(o).toMatchObject({ deadline: "2026-11-20", deadlineStatus: "ok" });
  });
  it("finds the CGPA requirement and doesn't flag 'graduates only' when students are welcome", () => {
    expect(o.minCgpa).toBe(3);
    expect(o.graduatesOnly).toBe(false);
  });
  it("finds how to apply", () => {
    expect(o.applyEmail).toBe("careers@nimbuslabs.pk");
    expect(o.applyUrl).toBe("https://nimbuslabs.pk/careers/frontend-intern");
  });
});

describe("extractOpening — a typical job post", () => {
  const o = extractOpening(JOB_POST, NOW);

  it("prefers a 'Job Title:' line", () => {
    expect(o.title).toBe("Associate Software Engineer");
  });
  it("finds type, city, onsite", () => {
    expect(o).toMatchObject({ type: "job", location: "Islamabad", workMode: "onsite" });
  });
  it("finds graduates-only and the lowest years of experience", () => {
    expect(o.graduatesOnly).toBe(true);
    expect(o.experienceYears).toBe(1);
  });
  it("reads 30/11/2026 as day/month", () => {
    expect(o).toMatchObject({ deadline: "2026-11-30", deadlineStatus: "ok" });
  });
  it("trims trailing punctuation from the link", () => {
    expect(o.applyUrl).toBe("https://kestrel.pk/jobs/ase?ref=board");
  });
});

describe("extractOpening — never guesses", () => {
  it("leaves everything empty for text with no details", () => {
    const o = extractOpening("Great company culture and free snacks!", NOW);
    expect(o).toMatchObject({
      title: null,
      type: "unclear",
      location: null,
      workMode: null,
      skills: [],
      experienceYears: null,
      minCgpa: null,
      deadline: null,
      deadlineStatus: "none",
      applyEmail: null,
      applyUrl: null,
    });
  });

  it("flags a date that could be 5 Nov or 11 May", () => {
    expect(extractOpening("Developer\nDeadline: 05/11", NOW).deadlineStatus).toBe("check");
  });

  it("flags relative dates like 'next Friday'", () => {
    expect(extractOpening("Developer\nApply by next Friday", NOW).deadlineStatus).toBe("check");
  });

  it("flags a deadline line it can't read", () => {
    expect(extractOpening("Developer\nDeadline: soon-ish", NOW)).toMatchObject({ deadline: null, deadlineStatus: "check" });
  });

  it("marks a deadline that has already passed", () => {
    expect(extractOpening("Developer\nLast date: 3 Oct 2026", NOW)).toMatchObject({ deadline: "2026-10-03", deadlineStatus: "past" });
  });

  it("treats 'fresh graduates' as 0 years of experience", () => {
    expect(extractOpening("Junior Developer for fresh graduates", NOW).experienceYears).toBe(0);
  });

  it("detects remote work but not 'not remote'", () => {
    expect(extractOpening("Remote React developer", NOW).workMode).toBe("remote");
    expect(extractOpening("Developer, not remote, sorry", NOW).workMode).toBe(null);
  });
});

describe("extractOpening — hostile input", () => {
  it("ignores javascript: and data: links", () => {
    const o = extractOpening("Developer\nApply: javascript:alert(1) or data:text/html,<script>alert(1)</script>", NOW);
    expect(o.applyUrl).toBeNull();
  });

  it("keeps markup as plain text in the title (rendering escapes it)", () => {
    const o = extractOpening("<img src=x onerror=alert(1)> Developer", NOW);
    expect(o.title).toBe("<img src=x onerror=alert(1)> Developer");
  });

  it("rejects malformed emails", () => {
    expect(extractOpening("Developer\nSend CV to hr@@bad..pk", NOW).applyEmail).toBeNull();
  });

  it("handles a huge paste quickly and only reads the first 20,000 characters", () => {
    const start = Date.now();
    const o = extractOpening("Developer\n" + "lorem ipsum ".repeat(200_000) + "\nDeadline: 20 Nov 2026", NOW);
    expect(Date.now() - start).toBeLessThan(2000);
    expect(o.deadlineStatus).toBe("none"); // the deadline was past the 20,000-character cut
  });
});

describe("todayPk", () => {
  it("uses Pakistan time, not the computer's time zone", () => {
    // 23:30 UTC on 4 Nov is already 5 Nov in Pakistan.
    expect(todayPk(new Date("2026-11-04T23:30:00Z"))).toBe("2026-11-05");
  });
});
