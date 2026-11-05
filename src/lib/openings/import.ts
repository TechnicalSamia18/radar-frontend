// Restores openings from a CSV made by "Export CSV" (decision record,
// decision 1: data lives in one browser, so a backup must be restorable).
//
// Rules: rows are added, never replacing what's there; an opening already in
// Radar (same company and title) is skipped; each bad row is reported with
// its row number and reason; every restored opening is checked with the same
// schema as everything else Radar stores.
import { parseCsv } from "@/lib/companies/csv";
import { APPLICATION_STATUS, DEADLINE_STATUS, openingSchema, type Opening, type RadarState } from "@/lib/data/schema";
import { canonicalSkill } from "@/lib/skills/detect";
import { STATUS_LABEL } from "./tracker";

export const MAX_OPENINGS_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_OPENINGS_IMPORT_ROWS = 2000;

export type OpeningsImportReport = { added: number; duplicates: string[]; failed: Array<{ row: number; reason: string }> };

/** Undo the export's formula protection: a leading apostrophe before = + - @ tab or CR. */
function unneutralise(v: string) {
  return /^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v;
}

const blank = (v: string | undefined) => {
  const t = unneutralise((v ?? "").trim());
  return t === "" ? null : t;
};

const LABEL_TO_STATUS = new Map(Object.entries(STATUS_LABEL).map(([k, v]) => [v.toLowerCase(), k as Opening["status"]]));

function toIso(date: string | null, fallback: Date): string {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const d = new Date(`${date}T12:00:00+05:00`);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return fallback.toISOString();
}

function list(v: string | null): string[] {
  return v ? v.split(";").map((s) => canonicalSkill(s)).filter(Boolean) : [];
}

export function importOpenings(
  state: RadarState,
  text: string,
  now: Date,
  newId: () => string,
): { state: RadarState; report: OpeningsImportReport } | { error: string } {
  if (text.length > MAX_OPENINGS_IMPORT_BYTES) return { error: "That file is over 2 MB. Is it really a Radar export?" };
  const rows = parseCsv(text.replace(/^﻿/, ""));
  if (rows.length < 2) return { error: "The file has no openings to import." };
  if (rows.length - 1 > MAX_OPENINGS_IMPORT_ROWS) return { error: `That file has more than ${MAX_OPENINGS_IMPORT_ROWS} rows.` };

  const col = new Map(rows[0].map((h, i) => [h.trim().toLowerCase(), i]));
  if (!col.has("company") || !col.has("title")) {
    return { error: "This doesn't look like a Radar openings export: it needs 'Company' and 'Title' columns. (For a list of companies, use Import CSV on the Companies page.)" };
  }
  const get = (cells: string[], name: string) => blank(cells[col.get(name) ?? -1]);

  const report: OpeningsImportReport = { added: 0, duplicates: [], failed: [] };
  const seen = new Set(state.openings.map((o) => `${o.companyName}\u0000${o.title}`.toLowerCase()));
  const added: Opening[] = [];

  rows.slice(1).forEach((cells, i) => {
    const row = i + 2;
    const companyName = get(cells, "company");
    const title = get(cells, "title");
    if (!companyName || !title) {
      report.failed.push({ row, reason: "missing company or title" });
      return;
    }
    const key = `${companyName}\u0000${title}`.toLowerCase();
    if (seen.has(key)) {
      report.duplicates.push(`${title} (${companyName})`);
      return;
    }

    // Skills: the full list if the file has it, otherwise rebuilt from Has + Missing (older exports).
    const skills = col.has("skills") ? list(get(cells, "skills")) : [...list(get(cells, "has")), ...list(get(cells, "missing"))];
    const deadlineCell = get(cells, "deadline");
    const isDate = !!deadlineCell && /^\d{4}-\d{2}-\d{2}$/.test(deadlineCell);
    const statusFromFile = get(cells, "deadline status");
    const deadlineStatus = DEADLINE_STATUS.find((d) => d === statusFromFile) ?? (isDate ? "ok" : deadlineCell ? "check" : "none");
    const status = LABEL_TO_STATUS.get((get(cells, "status") ?? "saved").toLowerCase()) ?? null;
    if (!status || !APPLICATION_STATUS.includes(status)) {
      report.failed.push({ row, reason: `unknown status "${get(cells, "status")}"` });
      return;
    }
    const exp = get(cells, "experience (years)");
    const cgpa = get(cells, "minimum cgpa");

    const candidate = {
      id: newId(),
      companyId: state.companies.find((c) => c.name.toLowerCase() === companyName.toLowerCase())?.id ?? null,
      companyName,
      title,
      type: get(cells, "type") ?? "unclear",
      location: get(cells, "city"),
      workMode: get(cells, "work mode"),
      skills: [...new Map(skills.map((s) => [s.toLowerCase(), s])).values()],
      experienceYears: exp === null ? null : Number(exp),
      graduatesOnly: get(cells, "graduates only") === "Yes",
      minCgpa: cgpa === null ? null : Number(cgpa),
      deadline: isDate ? deadlineCell : null,
      deadlineText: !isDate && deadlineCell ? deadlineCell.replace(/^Check:\s*/i, "").slice(0, 80) : null,
      deadlineStatus,
      applyUrl: get(cells, "apply link"),
      applyEmail: get(cells, "apply email"),
      sourceUrl: get(cells, "source"),
      adKind: "text",
      rawText: "",
      firstSeen: toIso(get(cells, "first seen"), now),
      status,
      statusHistory: [{ status, at: toIso(get(cells, "status changed"), now) }],
      notes: get(cells, "notes") ?? "",
    };
    // Same strict check as everything else Radar stores: bad links, unknown types, CGPA > 4… are rejected.
    const parsed = openingSchema.safeParse(candidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      report.failed.push({ row, reason: `${String(issue.path[0] ?? "row")}: ${issue.message}` });
      return;
    }
    seen.add(key);
    added.push(parsed.data);
  });

  report.added = added.length;
  return { state: { ...state, openings: [...added, ...state.openings] }, report };
}
