// The "Add opening" form: validation (reject, don't repair) and turning the
// checked form into a stored Opening + its company.
import { z } from "zod";
import type { Company, Opening, RadarState } from "@/lib/data/schema";
import { DEADLINE_STATUS, OPENING_TYPE, WORK_MODE } from "@/lib/data/schema";
import { MAX_SKILLS } from "@/lib/profile/options";
import { canonicalSkill } from "@/lib/skills/detect";
import { MAX_POST_CHARS, todayPk } from "./extract";

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const optionalText = (max: number) => z.preprocess(blank, z.string().trim().max(max).nullable());
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), schema.nullable());
const httpUrl = z
  .url({ protocol: /^https?$/, message: "Use a full link starting with http:// or https://." })
  .max(500);

export const openingFormSchema = z
  .strictObject({
    companyName: z.string().trim().min(1, "Add the company's name.").max(120),
    title: z.string().trim().min(1, "Add the role's title.").max(160),
    type: z.enum(OPENING_TYPE),
    location: optionalText(80),
    workMode: z.preprocess(blank, z.enum(WORK_MODE).nullable()),
    skills: z
      .array(z.string().trim().min(1).max(40).regex(/^[\p{L}\p{N} +#./&()-]+$/u, "Skills can use letters, numbers, spaces and + # . / & ( ) - only."))
      .max(MAX_SKILLS),
    experienceYears: optionalNumber(z.number().int("Use a whole number of years.").min(0).max(30)),
    graduatesOnly: z.boolean(),
    minCgpa: optionalNumber(z.number().min(0).max(4, "CGPA is out of 4.00.")),
    deadline: z.preprocess(blank, z.iso.date({ message: "Pick a valid date." }).nullable()),
    deadlineText: optionalText(80),
    deadlineChecked: z.boolean(),
    applyEmail: z.preprocess(blank, z.email("That email address doesn't look right.").max(200).nullable()),
    applyUrl: z.preprocess(blank, httpUrl.nullable()),
    sourceUrl: z.preprocess(blank, httpUrl.nullable()),
    adKind: z.enum(["text", "image"]),
    rawText: z.string().max(MAX_POST_CHARS, "That post is too long; paste just the job description."),
  })
  .superRefine((v, ctx) => {
    if (v.adKind === "image" && !v.sourceUrl) {
      ctx.addIssue({ code: "custom", path: ["sourceUrl"], message: "Add the link to the post so you can open it later." });
    }
    if (v.adKind === "text" && v.rawText.trim().length === 0) {
      ctx.addIssue({ code: "custom", path: ["rawText"], message: "Paste the job post, or tick “The job ad is an image”." });
    }
  });

export type OpeningForm = z.output<typeof openingFormSchema>;

/** Reads the form's fields by name. Unknown fields are never read. */
export function openingFormToObject(form: FormData) {
  const s = (k: string) => (form.get(k) ?? "") as string;
  return {
    companyName: s("companyName"),
    title: s("title"),
    type: s("type"),
    location: s("location"),
    workMode: s("workMode"),
    skills: form.getAll("skills").map(String),
    experienceYears: s("experienceYears"),
    graduatesOnly: form.get("graduatesOnly") === "on",
    minCgpa: s("minCgpa"),
    deadline: s("deadline"),
    deadlineText: s("deadlineText"),
    deadlineChecked: form.get("deadlineChecked") === "on",
    applyEmail: s("applyEmail"),
    applyUrl: s("applyUrl"),
    sourceUrl: s("sourceUrl"),
    adKind: form.get("adKind") === "image" ? "image" : "text",
    rawText: s("rawText"),
  };
}

function deadlineStatus(f: OpeningForm, now: Date): (typeof DEADLINE_STATUS)[number] {
  if (!f.deadline) return f.deadlineText ? "check" : "none";
  if (f.deadline < todayPk(now)) return "past";
  return f.deadlineChecked ? "ok" : "check";
}

/**
 * Adds the opening (and its company, if new) to the state. Pure: returns new state.
 * A deadline already passed starts the opening as "missed" (PRD §4).
 */
export function addOpening(state: RadarState, f: OpeningForm, ids: { opening: string; company: string }, now: Date): { state: RadarState; opening: Opening } {
  const at = now.toISOString();
  const existing = state.companies.find((c) => c.name.toLowerCase() === f.companyName.toLowerCase());
  const company: Company | null = existing
    ? null
    : {
        id: ids.company,
        name: f.companyName,
        city: f.location,
        website: null,
        careersUrl: null,
        hiringEmail: f.applyEmail,
        careersStatus: f.applyUrl || f.sourceUrl ? "careers_page" : f.applyEmail ? "email_only" : "not_checked",
        lastChecked: null,
        failures: 0,
        createdAt: at,
      };

  const dStatus = deadlineStatus(f, now);
  const status = dStatus === "past" ? "missed" : "saved";
  const seen = new Set<string>();
  const skills = f.skills.map(canonicalSkill).filter((s) => !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));

  const opening: Opening = {
    id: ids.opening,
    companyId: existing?.id ?? ids.company,
    companyName: existing?.name ?? f.companyName,
    title: f.title,
    type: f.type,
    location: f.location,
    workMode: f.workMode,
    skills,
    experienceYears: f.experienceYears,
    graduatesOnly: f.graduatesOnly,
    minCgpa: f.minCgpa,
    deadline: f.deadline,
    deadlineText: f.deadlineText,
    deadlineStatus: dStatus,
    applyUrl: f.applyUrl,
    applyEmail: f.applyEmail,
    sourceUrl: f.sourceUrl,
    adKind: f.adKind,
    rawText: f.rawText,
    firstSeen: at,
    status,
    statusHistory: [{ status, at }],
    notes: "",
  };

  return {
    opening,
    state: {
      ...state,
      companies: company ? [...state.companies, company] : state.companies,
      openings: [opening, ...state.openings],
    },
  };
}
