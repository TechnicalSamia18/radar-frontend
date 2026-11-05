// CSV export of openings and companies (REQ-052).
//
// Security: a cell that starts with = + - @ (or tab / carriage return) is run
// as a formula by Excel. A malicious job post could use that to plant a
// formula in your spreadsheet, so such cells get a leading apostrophe,
// which makes Excel show them as plain text (OWASP "CSV injection").
import type { RadarState } from "@/lib/data/schema";
import { companyStatus } from "@/lib/companies/status";
import { matchOpening } from "./match";
import { STATUS_LABEL } from "./tracker";

export function neutralise(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function csvCell(value: string | number | boolean | null | undefined): string {
  const s = neutralise(value === null || value === undefined ? "" : String(value));
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: Array<Array<string | number | boolean | null | undefined>>): string {
  // Byte-order mark so Excel opens Urdu or other non-English text correctly.
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function openingsCsv(state: RadarState, now: Date): string {
  // The last five columns exist so a backup can be restored exactly (see import.ts).
  const header = ["Company", "Title", "Type", "City", "Work mode", "Fit", "Has", "Missing", "Warnings", "Deadline", "Status", "Status changed", "Apply link", "Apply email", "Source", "Notes", "First seen", "Skills", "Experience (years)", "Graduates only", "Minimum CGPA", "Deadline status"];
  const rows = state.openings.map((o) => {
    const fit = matchOpening(o, state.profile, now);
    const last = o.statusHistory[o.statusHistory.length - 1];
    return [
      o.companyName,
      o.title,
      o.type,
      o.location,
      o.workMode,
      fit.kind === "scored" ? `${fit.score}%` : "Unknown",
      fit.kind === "scored" ? fit.has.join("; ") : "",
      fit.kind === "scored" ? fit.missing.join("; ") : "",
      fit.kind === "scored" ? fit.warnings.join(" ") : "",
      o.deadline ?? (o.deadlineText ? `Check: ${o.deadlineText}` : ""),
      STATUS_LABEL[o.status],
      last?.at.slice(0, 10),
      o.applyUrl,
      o.applyEmail,
      o.sourceUrl,
      o.notes,
      o.firstSeen.slice(0, 10),
      o.skills.join("; "),
      o.experienceYears,
      o.graduatesOnly ? "Yes" : "No",
      o.minCgpa,
      o.deadlineStatus,
    ];
  });
  return toCsv(header, rows);
}

export function companiesCsv(state: RadarState): string {
  const header = ["Name", "City", "Website", "Careers page", "Hiring email", "Careers source", "Added"];
  return toCsv(header, state.companies.map((c) => [c.name, c.city, c.website, c.careersUrl, c.hiringEmail, companyStatus(c).text, c.createdAt.slice(0, 10)]));
}

/** Starts a download of `text` as a file, entirely in the browser. */
export function downloadText(text: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
