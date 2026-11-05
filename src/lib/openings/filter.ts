// Combined filters for the openings list (REQ-051). Every filter is optional;
// together they narrow the list (AND).
import type { ApplicationStatus, Opening, Profile } from "@/lib/data/schema";
import { matchOpening, type FitLevel } from "./match";
import { isNewThisWeek } from "./tracker";

export type Filters = {
  q: string; // title or company contains
  city: string; // "" = any
  workMode: "" | "onsite" | "hybrid" | "remote";
  type: "" | "internship" | "job";
  fit: "" | FitLevel | "unknown";
  status: "" | "active" | ApplicationStatus; // active = saved, applied or interview
  newOnly: boolean;
};

export const NO_FILTERS: Filters = { q: "", city: "", workMode: "", type: "", fit: "", status: "active", newOnly: false };

export type SortKey = "fit" | "deadline" | "newest";

export function filterOpenings(openings: Opening[], profile: Profile | null, f: Filters, sort: SortKey, now: Date) {
  const q = f.q.trim().toLowerCase();
  const rows = openings
    .map((o) => ({ opening: o, fit: matchOpening(o, profile, now) }))
    .filter(({ opening: o, fit }) => {
      if (q && !`${o.title} ${o.companyName}`.toLowerCase().includes(q)) return false;
      if (f.city && o.location !== f.city) return false;
      if (f.workMode && o.workMode !== f.workMode) return false;
      if (f.type && o.type !== f.type) return false;
      if (f.fit === "unknown" && fit.kind !== "unknown") return false;
      if (f.fit && f.fit !== "unknown" && (fit.kind !== "scored" || fit.level !== f.fit)) return false;
      if (f.status === "active" && !["saved", "applied", "interview"].includes(o.status)) return false;
      if (f.status && f.status !== "active" && o.status !== f.status) return false;
      if (f.newOnly && !isNewThisWeek(o, now)) return false;
      return true;
    });

  const fitScore = (r: (typeof rows)[number]) => (r.fit.kind === "scored" ? r.fit.score : -1);
  rows.sort((a, b) => {
    if (sort === "deadline") {
      // Soonest deadline first; openings without one go last.
      const da = a.opening.deadline ?? "9999";
      const db = b.opening.deadline ?? "9999";
      return da.localeCompare(db) || fitScore(b) - fitScore(a);
    }
    if (sort === "newest") return b.opening.firstSeen.localeCompare(a.opening.firstSeen);
    return fitScore(b) - fitScore(a) || b.opening.firstSeen.localeCompare(a.opening.firstSeen);
  });
  return rows;
}

export function activeFilterCount(f: Filters): number {
  return (Object.keys(NO_FILTERS) as Array<keyof Filters>).filter((k) => f[k] !== NO_FILTERS[k]).length;
}
