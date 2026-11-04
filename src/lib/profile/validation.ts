// Server-side validation for the profile form (REQ-032).
// Rule: reject bad input with a message, never "fix" it silently.
import { z } from "zod";
import { CITIES, MAX_SKILLS, REMOTE_PREFERENCE, SEEKING } from "./options";
import { canonicalSkill } from "@/lib/skills/detect";

export { CITIES, MAX_SKILLS };

// Letters, digits, spaces and the symbols real skill names use (C++, C#, Node.js, CI/CD, R&D, UI/UX).
const SKILL_PATTERN = /^[\p{L}\p{N} +#./&()-]+$/u;

/** "" or missing → null; anything else → Number (NaN fails the number check). */
const blankToNull = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));

export const profileSchema = z.strictObject({
  skills: z
    .array(
      z
        .string()
        .trim()
        .min(1, "A skill can't be empty.")
        .max(40, "Keep each skill under 40 characters.")
        .regex(SKILL_PATTERN, "Skills can use letters, numbers, spaces and + # . / & ( ) - only."),
    )
    .max(MAX_SKILLS, `Keep it to ${MAX_SKILLS} skills or fewer.`)
    .transform((list) => {
      // Map aliases to one name ("reactjs" → "React") and drop duplicates, ignoring case.
      const seen = new Set<string>();
      return list.map(canonicalSkill).filter((s) => {
        const key = s.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }),
  semester: z.preprocess(blankToNull, z.number().int().min(1).max(12).nullable()),
  graduationYear: z.preprocess(blankToNull, z.number().int().min(2020).max(2040).nullable()),
  cgpa: z.preprocess(blankToNull, z.number().min(0).max(4, "CGPA is out of 4.00.").nullable()),
  cities: z.array(z.enum(CITIES)).max(CITIES.length),
  remotePreference: z.enum(REMOTE_PREFERENCE),
  seeking: z.enum(SEEKING),
});

export type ProfileInput = z.output<typeof profileSchema>;

/** Pulls only the fields we expect out of the submitted form. Unknown fields are never read. */
export function profileFormToObject(form: FormData) {
  return {
    skills: form.getAll("skills").map(String),
    semester: form.get("semester") ?? "",
    graduationYear: form.get("graduationYear") ?? "",
    cgpa: form.get("cgpa") ?? "",
    cities: form.getAll("cities").map(String),
    remotePreference: form.get("remotePreference") ?? "",
    seeking: form.get("seeking") ?? "",
  };
}

/** Turns Zod issues into { fieldName: "first message" } for the form. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
