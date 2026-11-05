// Scores an opening against the profile and explains why (REQ-040–042).
//
// Score out of 100:
//   70 — share of the post's skills you have. If the post names fewer than 3
//        skills, this part is scaled down (one matching skill says little).
//   15 — internship/job matches what you're looking for
//   15 — experience asked for (0 or not stated = full marks)
// Senior, lead, manager and "experienced" roles are capped at 44 (low fit):
// Radar is for students and fresh graduates, for whom they aren't realistic.
// Warnings never hide an opening; each is one plain sentence (REQ-041).
import type { Opening, Profile } from "@/lib/data/schema";

export type FitLevel = "good" | "fair" | "low";

export type Fit =
  | { kind: "unknown"; reason: string }
  | { kind: "scored"; score: number; level: FitLevel; has: string[]; missing: string[]; warnings: string[] };

type MatchInput = Pick<
  Opening,
  | "title"
  | "skills"
  | "type"
  | "experienceYears"
  | "graduatesOnly"
  | "minCgpa"
  | "location"
  | "workMode"
  | "adKind"
  | "deadlineStatus"
  | "deadlineText"
>;

/** Senior titles usually need years of experience, even when the post doesn't say how many. */
export const SENIOR_TITLE = /\b(senior|sr\.?|lead|principal|staff|manager|director|head of|vp|architect|experienced)\b/i;
const SENIOR_CAP = 44;

export function fitLevel(score: number): FitLevel {
  if (score >= 70) return "good";
  if (score >= 45) return "fair";
  return "low";
}

/** Eligibility warnings (REQ-041). Shown even when the fit score is unknown. */
export function eligibilityWarnings(o: MatchInput, profile: Profile | null, now: Date): string[] {
  const w: string[] = [];
  const year = Number(new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: "Asia/Karachi" }).format(now));

  if (o.graduatesOnly && profile?.graduationYear && profile.graduationYear > year) {
    w.push(`Asks for graduates; you finish in ${profile.graduationYear}.`);
  }
  if (o.minCgpa !== null && profile?.cgpa != null && profile.cgpa < o.minCgpa) {
    w.push(`Asks for a CGPA of ${o.minCgpa.toFixed(1)} or more; yours is ${profile.cgpa.toFixed(2)}.`);
  }
  if (o.experienceYears !== null && o.experienceYears >= 1) {
    w.push(`Asks for ${o.experienceYears}+ year${o.experienceYears === 1 ? "" : "s"} of experience.`);
  } else if (SENIOR_TITLE.test(o.title)) {
    w.push("It's a senior role, so the fit is capped: these usually need several years of experience.");
  }
  if (profile && o.location && o.workMode !== "remote" && profile.cities.length > 0 && !profile.cities.includes(o.location as never)) {
    w.push(`It's in ${o.location}, which isn't one of your cities.`);
  }
  if (profile?.remotePreference === "remote_only" && o.workMode && o.workMode !== "remote") {
    w.push(`It's ${o.workMode === "onsite" ? "onsite" : "hybrid"}, but you prefer remote only.`);
  }
  if (profile?.seeking === "internship" && o.type === "job") w.push("It's a job; you're looking for internships.");
  if (profile?.seeking === "job" && o.type === "internship") w.push("It's an internship; you're looking for jobs.");
  if (o.deadlineStatus === "past") w.push("The deadline has passed.");
  if (o.deadlineStatus === "check") w.push(`Check the deadline${o.deadlineText ? `: "${o.deadlineText}"` : ""}.`);
  return w;
}

export function matchOpening(o: MatchInput, profile: Profile | null, now: Date = new Date()): Fit {
  if (o.adKind === "image") return { kind: "unknown", reason: "The job ad is an image, so Radar couldn't read it. Open it to check." };
  if (!profile || profile.skills.length === 0) return { kind: "unknown", reason: "Add your skills in your profile to see how well you fit." };
  if (o.skills.length === 0) return { kind: "unknown", reason: "The post doesn't name any skills Radar knows." };

  const mine = new Set(profile.skills.map((s) => s.toLowerCase()));
  const has = o.skills.filter((s) => mine.has(s.toLowerCase()));
  const missing = o.skills.filter((s) => !mine.has(s.toLowerCase()));

  const evidence = Math.min(1, o.skills.length / 3);
  const skillPoints = 70 * (has.length / o.skills.length) * evidence;
  const typePoints =
    o.type === "unclear" || profile.seeking === "both" ? (o.type === "unclear" ? 8 : 15) : o.type === profile.seeking ? 15 : 0;
  const expPoints = o.experienceYears === null || o.experienceYears === 0 ? 15 : o.experienceYears === 1 ? 8 : 0;

  const raw = Math.round(skillPoints + typePoints + expPoints);
  const score = SENIOR_TITLE.test(o.title) ? Math.min(raw, SENIOR_CAP) : raw;
  return { kind: "scored", score, level: fitLevel(score), has, missing, warnings: eligibilityWarnings(o, profile, now) };
}

/** "Has: React, Git · Missing: Node.js" (REQ-040 wording). */
export function fitSummary(fit: Extract<Fit, { kind: "scored" }>): string {
  const parts = [];
  if (fit.has.length) parts.push(`Has: ${fit.has.join(", ")}`);
  if (fit.missing.length) parts.push(`Missing: ${fit.missing.join(", ")}`);
  return parts.join(" · ");
}
