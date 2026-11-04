// Reads a pasted job post and pulls out the details Radar needs (REQ-022).
//
// Rule: never guess. Every field is either found in the text or left empty,
// and the form shows empty fields as "Not stated" for the user to fill in.
// Dates that could mean two things ("05/11", "next Friday") are flagged
// "check" instead of trusted (PRD §4).
import * as chrono from "chrono-node";
import { z } from "zod";
import { CITIES } from "@/lib/profile/options";
import { detectSkills } from "@/lib/skills/detect";

export const MAX_POST_CHARS = 20_000;

export type OpeningType = "internship" | "job" | "unclear";
export type WorkMode = "onsite" | "hybrid" | "remote";
export type DeadlineStatus = "ok" | "check" | "none" | "past";

export type ExtractedOpening = {
  title: string | null;
  type: OpeningType;
  location: string | null;
  workMode: WorkMode | null;
  skills: string[];
  experienceYears: number | null;
  graduatesOnly: boolean;
  minCgpa: number | null;
  deadline: string | null; // YYYY-MM-DD
  deadlineText: string | null;
  deadlineStatus: DeadlineStatus;
  applyEmail: string | null;
  applyUrl: string | null;
};

const ROLE_WORDS =
  /\b(intern(ship)?|trainee|engineer|developer|designer|analyst|associate|qa|sqa|devops|architect|programmer|scientist|specialist|lead|consultant|administrator|tester)\b/i;
const TITLE_LABEL = /^\s*(?:job\s*title|position|role|post|vacancy|opening)\s*[:\-–]\s*(.+)$/i;
const HIRING_PREFIX = /^\s*(?:(?:we(?:'re| are)\s+)?(?:hiring|looking for)\s*(?:an?\s+)?[:!\-–]?\s*)/i;

/** First line that names the role. "Job title: X" wins; otherwise the first short line with a role word. */
function findTitle(lines: string[]): string | null {
  for (const line of lines) {
    const m = line.match(TITLE_LABEL);
    if (m && ROLE_WORDS.test(m[1])) return tidyTitle(m[1]);
  }
  for (const line of lines.slice(0, 15)) {
    if (line.length <= 100 && ROLE_WORDS.test(line) && !/@|https?:\/\//i.test(line)) {
      // Remove emoji/markdown first, then a leading "We're hiring:".
      return tidyTitle(tidyTitle(line).replace(HIRING_PREFIX, ""));
    }
  }
  return null;
}

function tidyTitle(s: string) {
  return s.replace(/[#*_|•🚀📢✨]+/gu, " ").replace(/\s+/g, " ").replace(/[.!:\-–\s]+$/, "").trim().slice(0, 160) || "Untitled";
}

function findType(text: string): OpeningType {
  if (/\b(intern(ship)?s?|trainee(ship)?)\b/i.test(text)) return "internship";
  if (/\b(full[- ]?time|part[- ]?time|permanent|contract(ual)?|salary|engineer|developer|associate)\b/i.test(text)) return "job";
  return "unclear";
}

function findWorkMode(text: string): WorkMode | null {
  if (/\bhybrid\b/i.test(text)) return "hybrid";
  const remote = /\b(remote(ly)?|work from home|wfh)\b/i.test(text) && !/\b(not|no)\s+remote\b/i.test(text);
  const onsite = /\b(on[- ]?site|in[- ]?office|on[- ]?premises?)\b/i.test(text);
  if (remote && onsite) return "hybrid";
  if (remote) return "remote";
  if (onsite) return "onsite";
  return null;
}

function findLocation(text: string): string | null {
  let best: { city: string; index: number } | null = null;
  for (const city of CITIES) {
    const i = text.search(new RegExp(`\\b${city}\\b`, "i"));
    if (i >= 0 && (!best || i < best.index)) best = { city, index: i };
  }
  return best?.city ?? null;
}

function findExperience(text: string): number | null {
  if (/\b(no (prior )?experience (is )?required|fresh(ers?| graduates?)|0\s*years?)\b/i.test(text)) return 0;
  // "2+ years", "1-2 years of experience", "minimum 3 yrs" — take the lowest number mentioned.
  const re = /(\d{1,2})\s*(?:\+|\s*(?:-|–|to)\s*\d{1,2})?\s*(?:years?|yrs?)\b(?=[^.\n]{0,40}\bexperience\b|\s+of\b)/gi;
  let min: number | null = null;
  for (const m of text.matchAll(re)) {
    const n = Number(m[1]);
    if (n <= 30 && (min === null || n < min)) min = n;
  }
  return min;
}

function findGraduatesOnly(text: string): boolean {
  const asksForDegree =
    /\b(graduates? only|fresh graduates?|degree holders?|completed (?:a |your |their )?(?:bs|bsc|be|bachelor'?s?|degree)|must (?:have|hold) (?:a |an )?(?:bs|bsc|be|bachelor'?s?|degree))\b/i.test(text);
  const studentsWelcome = /\b(final[- ]year|current(ly)? enrolled|undergraduates?|students? (?:can|may|are welcome|in their))\b/i.test(text);
  return asksForDegree && !studentsWelcome;
}

function findMinCgpa(text: string): number | null {
  const patterns = [
    /\b(?:c?gpa)\b[^0-9\n]{0,25}(\d(?:\.\d{1,2})?)/i, // "CGPA of 3.0 or above"
    /(\d\.\d{1,2})\s*(?:\/\s*4(?:\.0+)?)?\s*(?:c?gpa)\b/i, // "3.0/4.0 CGPA"
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = Number(m[1]);
      if (n >= 2 && n <= 4) return n;
    }
  }
  return null;
}

const DEADLINE_LINE = /\b(deadline|apply by|apply before|last date|closing date|applications? close|due date|submit by)\b/i;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Today's date in Pakistan as YYYY-MM-DD. */
export function todayPk(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(now);
}

function findDeadline(lines: string[], now: Date): Pick<ExtractedOpening, "deadline" | "deadlineText" | "deadlineStatus"> {
  const line = lines.find((l) => DEADLINE_LINE.test(l));
  if (!line) return { deadline: null, deadlineText: null, deadlineStatus: "none" };

  // en.GB reads "20/11" as day/month, as in Pakistan.
  const result = chrono.en.GB.parse(line, now, { forwardDate: true })[0];
  if (!result) return { deadline: null, deadlineText: line.trim().slice(0, 80), deadlineStatus: "check" };

  const s = result.start;
  const text = result.text.slice(0, 80);
  if (!s.isCertain("day") || !s.isCertain("month")) {
    // "next Friday", "end of November": a date, but not one to trust.
    const approx = s.isCertain("month") || s.isCertain("weekday") ? `${s.get("year")}-${pad(s.get("month")!)}-${pad(s.get("day")!)}` : null;
    return { deadline: approx, deadlineText: text, deadlineStatus: "check" };
  }

  const iso = `${s.get("year")}-${pad(s.get("month")!)}-${pad(s.get("day")!)}`;
  // "05/11": both numbers could be the month, so it could be 5 Nov or 11 May.
  const numeric = result.text.match(/^(\d{1,2})[/.-](\d{1,2})/);
  const ambiguous = numeric !== null && Number(numeric[1]) <= 12 && Number(numeric[2]) <= 12 && numeric[1] !== numeric[2];
  if (iso < todayPk(now)) return { deadline: iso, deadlineText: text, deadlineStatus: ambiguous ? "check" : "past" };
  return { deadline: iso, deadlineText: text, deadlineStatus: ambiguous ? "check" : "ok" };
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/gi;

function findApplyEmail(text: string): string | null {
  const emails = [...text.matchAll(EMAIL_RE)].map((m) => m[0].replace(/\.$/, ""));
  // Prefer an address on a line that talks about applying or sending a CV.
  const near = emails.find((e) => new RegExp(`(apply|send|cv|resume|email)[^\\n]{0,80}${e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(text));
  const pick = near ?? emails[0];
  return pick && z.email().safeParse(pick).success ? pick.toLowerCase() : null;
}

function findApplyUrl(text: string): string | null {
  const urls = [...text.matchAll(URL_RE)].map((m) => m[0].replace(/[.,;:!?]+$/, ""));
  const near = urls.find((u) => /apply|careers?|jobs?|form/i.test(u));
  const pick = near ?? urls[0];
  if (!pick || pick.length > 500) return null;
  try {
    const u = new URL(pick);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Pull details out of a pasted job post. Pure function: same text + date → same result. */
export function extractOpening(raw: string, now: Date = new Date()): ExtractedOpening {
  const text = raw.slice(0, MAX_POST_CHARS).replace(/\r\n?/g, "\n");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return {
    title: findTitle(lines),
    type: findType(text),
    location: findLocation(text),
    workMode: findWorkMode(text),
    skills: detectSkills(text),
    experienceYears: findExperience(text),
    graduatesOnly: findGraduatesOnly(text),
    minCgpa: findMinCgpa(text),
    ...findDeadline(lines, now),
    applyEmail: findApplyEmail(text),
    applyUrl: findApplyUrl(text),
  };
}
