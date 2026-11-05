// Add / edit / remove a company by hand (REQ-002, REQ-013).
import { z } from "zod";
import { CAREERS_STATUS, type Company, type RadarState } from "@/lib/data/schema";

const blank = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : typeof v === "string" ? v.trim() : v);
const url = z.preprocess(blank, z.url({ protocol: /^https?$/, message: "Use a full link starting with http:// or https://." }).max(300).nullable());

export const companyFormSchema = z.strictObject({
  name: z.string().trim().min(1, "Add the company's name.").max(120),
  city: z.preprocess(blank, z.string().max(60).nullable()),
  website: url,
  careersUrl: url,
  hiringEmail: z.preprocess(blank, z.email("That email address doesn't look right.").max(200).nullable()),
  careersStatus: z.enum(CAREERS_STATUS),
});
export type CompanyForm = z.output<typeof companyFormSchema>;

export function companyFormToObject(form: FormData) {
  const s = (k: string) => String(form.get(k) ?? "");
  return { name: s("name"), city: s("city"), website: s("website"), careersUrl: s("careersUrl"), hiringEmail: s("hiringEmail"), careersStatus: s("careersStatus") };
}

function host(u: string | null) {
  try {
    return u ? new URL(u).hostname.replace(/^www\./, "").toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Returns an error message for the field that clashes with another company, or null. */
export function findDuplicate(state: RadarState, f: CompanyForm, ignoreId?: string): { field: "name" | "website"; message: string } | null {
  const others = state.companies.filter((c) => c.id !== ignoreId);
  const sameName = others.find((c) => c.name.toLowerCase() === f.name.toLowerCase());
  if (sameName) return { field: "name", message: `${sameName.name} is already in your list.` };
  const h = host(f.website);
  const sameSite = h && others.find((c) => host(c.website) === h);
  if (sameSite) return { field: "website", message: `That website already belongs to ${sameSite.name}.` };
  return null;
}

export function addCompany(state: RadarState, f: CompanyForm, id: string, now: Date): RadarState {
  const company: Company = { id, ...f, lastChecked: null, failures: 0, createdAt: now.toISOString() };
  return { ...state, companies: [...state.companies, company] };
}

/**
 * Saves your edits. Your careers link replaces whatever was there and is
 * never overwritten automatically (REQ-013). Renaming updates its openings too.
 */
export function updateCompany(state: RadarState, id: string, f: CompanyForm): RadarState {
  return {
    ...state,
    companies: state.companies.map((c) => (c.id === id ? { ...c, ...f, failures: f.careersStatus === "unreachable" ? c.failures : 0 } : c)),
    openings: state.openings.map((o) => (o.companyId === id ? { ...o, companyName: f.name } : o)),
  };
}

/** Removes the company; its openings stay, unlinked, so no application history is lost. */
export function removeCompany(state: RadarState, id: string): RadarState {
  return {
    ...state,
    companies: state.companies.filter((c) => c.id !== id),
    openings: state.openings.map((o) => (o.companyId === id ? { ...o, companyId: null } : o)),
  };
}
