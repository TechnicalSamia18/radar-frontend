// Shapes of everything Radar stores (PRD §6, adapted for the browser — PRD §14).
// Zod schemas double as TypeScript types and as a check on data read back from
// localStorage, which a user (or another tab, or an old version) could have changed.
import { z } from "zod";
import { CITIES, MAX_SKILLS, REMOTE_PREFERENCE, SEEKING } from "@/lib/profile/options";

const isoDate = z.iso.datetime({ offset: true });
/** Links must be http(s): stops javascript: and data: links however the data arrived (form, import, hand-edited storage). */
const httpUrl = (max: number) => z.url({ protocol: /^https?$/ }).max(max);
const skill = z.string().min(1).max(40);
const shortText = (max: number) => z.string().max(max);

export const profileSchema = z.object({
  skills: z.array(skill).max(MAX_SKILLS),
  semester: z.number().int().min(1).max(12).nullable(),
  graduationYear: z.number().int().min(2020).max(2040).nullable(),
  cgpa: z.number().min(0).max(4).nullable(),
  cities: z.array(z.enum(CITIES)),
  remotePreference: z.enum(REMOTE_PREFERENCE),
  seeking: z.enum(SEEKING),
  resumeFileName: shortText(200).nullable(),
  updatedAt: isoDate,
});
export type Profile = z.infer<typeof profileSchema>;

/** Where a company publishes openings (REQ-010). In v1 the user sets this; the backend version will detect it. */
export const CAREERS_STATUS = ["careers_page", "email_only", "nothing_found", "unreachable", "blocked", "not_checked"] as const;
export type CareersStatus = (typeof CAREERS_STATUS)[number];

export const companySchema = z.object({
  id: z.string().min(1).max(40),
  name: shortText(120).min(1),
  city: shortText(60).nullable(),
  website: httpUrl(300).nullable(),
  careersUrl: httpUrl(300).nullable(),
  hiringEmail: z.email().max(200).nullable(),
  careersStatus: z.enum(CAREERS_STATUS),
  lastChecked: isoDate.nullable(),
  failures: z.number().int().min(0).max(1000),
  createdAt: isoDate,
});
export type Company = z.infer<typeof companySchema>;

export const OPENING_TYPE = ["internship", "job", "unclear"] as const;
export const WORK_MODE = ["onsite", "hybrid", "remote"] as const;
export const DEADLINE_STATUS = ["ok", "check", "none", "past"] as const;
export const APPLICATION_STATUS = ["saved", "applied", "interview", "offer", "rejected", "missed"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUS)[number];

export const openingSchema = z.object({
  id: z.string().min(1).max(40),
  companyId: z.string().max(40).nullable(),
  companyName: shortText(120).min(1),
  title: shortText(160).min(1),
  type: z.enum(OPENING_TYPE),
  location: shortText(80).nullable(),
  workMode: z.enum(WORK_MODE).nullable(),
  skills: z.array(skill).max(MAX_SKILLS),
  experienceYears: z.number().int().min(0).max(30).nullable(),
  graduatesOnly: z.boolean(),
  minCgpa: z.number().min(0).max(4).nullable(),
  deadline: z.iso.date().nullable(), // YYYY-MM-DD
  deadlineText: shortText(80).nullable(),
  deadlineStatus: z.enum(DEADLINE_STATUS),
  applyUrl: httpUrl(500).nullable(),
  applyEmail: z.email().max(200).nullable(),
  sourceUrl: httpUrl(500).nullable(),
  /** "image": the job ad was only an image/PDF, so nothing could be read (REQ-024 → fit unknown). */
  adKind: z.enum(["text", "image"]),
  rawText: shortText(20_000),
  firstSeen: isoDate,
  status: z.enum(APPLICATION_STATUS),
  statusHistory: z.array(z.object({ status: z.enum(APPLICATION_STATUS), at: isoDate })).max(50),
  notes: shortText(5_000),
});
export type Opening = z.infer<typeof openingSchema>;

export const STATE_VERSION = 1;
export const radarStateSchema = z.object({
  version: z.literal(STATE_VERSION),
  profile: profileSchema.nullable(),
  companies: z.array(companySchema).max(2_000),
  openings: z.array(openingSchema).max(5_000),
  /** True while the fictional sample data is loaded. */
  isDemo: z.boolean(),
  /** Live openings you saved: live id → your opening's id. (Added later; older saved data gets an empty map.) */
  feedLinks: z.record(z.string().max(200), z.string().max(40)).default({}),
  /** Live openings you marked "not interested". */
  dismissedFeedIds: z.array(z.string().max(200)).max(5_000).default([]),
});
export type RadarState = z.infer<typeof radarStateSchema>;

export const EMPTY_STATE: RadarState = {
  version: STATE_VERSION,
  profile: null,
  companies: [],
  openings: [],
  isDemo: false,
  feedLinks: {},
  dismissedFeedIds: [],
};
