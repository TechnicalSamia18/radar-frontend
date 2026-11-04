import { describe, expect, it } from "vitest";
import type { Profile } from "@/lib/data/schema";
import { fitLevel, fitSummary, matchOpening } from "./match";

const NOW = new Date("2026-11-04T12:00:00+05:00");

const profile: Profile = {
  skills: ["React", "JavaScript", "Git", "Python"],
  semester: 5,
  graduationYear: 2028,
  cgpa: 3.68,
  cities: ["Islamabad", "Rawalpindi"],
  remotePreference: "any",
  seeking: "internship",
  resumeFileName: null,
  updatedAt: "2026-11-04T10:00:00.000Z",
};

const base = {
  skills: ["React", "JavaScript", "Git", "TypeScript"],
  type: "internship" as const,
  experienceYears: null,
  graduatesOnly: false,
  minCgpa: null,
  location: "Islamabad",
  workMode: "hybrid" as const,
  adKind: "text" as const,
  deadlineStatus: "ok" as const,
  deadlineText: null,
};

describe("matchOpening", () => {
  it("scores skills, type and experience and explains them", () => {
    const fit = matchOpening(base, profile, NOW);
    expect(fit.kind).toBe("scored");
    if (fit.kind !== "scored") return;
    // 70 × 3/4 = 52.5, + 15 (internship) + 15 (no experience asked) = 82.5 → 83
    expect(fit.score).toBe(83);
    expect(fit.level).toBe("good");
    expect(fitSummary(fit)).toBe("Has: React, JavaScript, Git · Missing: TypeScript");
    expect(fit.warnings).toEqual([]);
  });

  it("matches skills ignoring case", () => {
    const fit = matchOpening({ ...base, skills: ["react"] }, profile, NOW);
    expect(fit.kind === "scored" && fit.has).toEqual(["react"]);
  });

  it("is 'fit unknown' without a profile, without skills, or for image ads (REQ-042)", () => {
    expect(matchOpening(base, null, NOW).kind).toBe("unknown");
    expect(matchOpening(base, { ...profile, skills: [] }, NOW).kind).toBe("unknown");
    expect(matchOpening({ ...base, skills: [] }, profile, NOW).kind).toBe("unknown");
    expect(matchOpening({ ...base, adKind: "image" }, profile, NOW)).toMatchObject({ kind: "unknown", reason: expect.stringMatching(/image/) });
  });

  it("gives one-line eligibility warnings and never hides the opening (REQ-041)", () => {
    const fit = matchOpening(
      { ...base, type: "job", graduatesOnly: true, minCgpa: 3.8, experienceYears: 2, location: "Karachi", workMode: "onsite", deadlineStatus: "check", deadlineText: "05/11" },
      profile,
      NOW,
    );
    expect(fit.kind).toBe("scored");
    if (fit.kind !== "scored") return;
    expect(fit.warnings).toEqual([
      "Asks for graduates; you finish in 2028.",
      "Asks for a CGPA of 3.8 or more; yours is 3.68.",
      "Asks for 2+ years of experience.",
      "It's in Karachi, which isn't one of your cities.",
      "It's a job; you're looking for internships.",
      'Check the deadline: "05/11".',
    ]);
  });

  it("doesn't warn about the city for remote roles", () => {
    const fit = matchOpening({ ...base, location: "Karachi", workMode: "remote" }, profile, NOW);
    expect(fit.kind === "scored" && fit.warnings).toEqual([]);
  });

  it("warns remote-only users about onsite roles", () => {
    const fit = matchOpening({ ...base, workMode: "onsite" }, { ...profile, remotePreference: "remote_only" }, NOW);
    expect(fit.kind === "scored" && fit.warnings).toContain("It's onsite, but you prefer remote only.");
  });

  it("lowers the score for experience asked and type mismatch", () => {
    const strong = matchOpening(base, profile, NOW);
    const weaker = matchOpening({ ...base, type: "job", experienceYears: 3 }, profile, NOW);
    expect(strong.kind === "scored" && weaker.kind === "scored" && weaker.score < strong.score).toBe(true);
  });
});

describe("fitLevel", () => {
  it("splits at 70 and 45", () => {
    expect([fitLevel(70), fitLevel(69), fitLevel(45), fitLevel(44)]).toEqual(["good", "fair", "fair", "low"]);
  });
});
