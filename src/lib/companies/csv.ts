// CSV import for companies (REQ-001, REQ-004, PRD §4 "Invalid import file").
// Valid rows import; bad rows are reported with the reason; duplicates are
// skipped; BPOs, call centres and marketing-only firms are filtered out.
import { z } from "zod";
import type { Company, RadarState } from "@/lib/data/schema";

export const MAX_IMPORT_BYTES = 1024 * 1024; // 1 MB ≈ thousands of rows
export const MAX_IMPORT_ROWS = 1000;
export const CSV_TEMPLATE = "name,city,website,careers_url,hiring_email,expertise\nNimbus Labs,Lahore,https://nimbus.example.com,https://nimbus.example.com/careers,careers@nimbus.example.com,Web development\n";

/** Minimal RFC 4180 parser: commas, quoted fields, "" escapes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

/** Missing column or empty cell → null ("not given"); otherwise the trimmed text. */
const blank = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : typeof v === "string" ? v.trim() : v);
const url = z.preprocess(blank, z.url({ protocol: /^https?$/, message: "isn't a full http(s) link" }).max(300).nullable());

const rowSchema = z.object({
  name: z.string().trim().min(1, "has no company name").max(120, "has a name over 120 characters"),
  city: z.preprocess(blank, z.string().max(60).nullable()),
  website: url,
  careersUrl: url,
  hiringEmail: z.preprocess(blank, z.email("has an invalid email").max(200).nullable()),
  expertise: z.preprocess(blank, z.string().max(300).nullable()),
});

/** Expertise that means "not a software house" (REQ-004). */
const NOT_SOFTWARE = /\b(bpo|call[- ]?cent(er|re)s?|contact[- ]?cent(er|re)|telemarketing|digital marketing|marketing agency|seo agency|data entry)\b/i;
const IS_SOFTWARE = /\b(software|web|app|mobile|development|developer|saas|cloud|ai|data science|devops|qa|testing|it services)\b/i;

export function isNonSoftware(expertise: string | null): boolean {
  return !!expertise && NOT_SOFTWARE.test(expertise) && !IS_SOFTWARE.test(expertise.replace(NOT_SOFTWARE, ""));
}

const HEADER_ALIASES: Record<string, keyof z.input<typeof rowSchema>> = {
  name: "name",
  company: "name",
  "company name": "name",
  city: "city",
  location: "city",
  website: "website",
  url: "website",
  "careers url": "careersUrl",
  careers_url: "careersUrl",
  careers: "careersUrl",
  "hiring email": "hiringEmail",
  hiring_email: "hiringEmail",
  email: "hiringEmail",
  expertise: "expertise",
  services: "expertise",
  category: "expertise",
};

export type ImportReport = {
  added: number;
  duplicates: string[];
  filtered: string[];
  failed: Array<{ row: number; reason: string }>;
};

function host(u: string | null) {
  if (!u) return null;
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function importCompanies(
  state: RadarState,
  text: string,
  now: Date,
  newId: () => string,
): { state: RadarState; report: ImportReport } | { error: string } {
  if (text.length > MAX_IMPORT_BYTES) return { error: "That file is over 1 MB. Split it into smaller files." };
  const rows = parseCsv(text.replace(/^﻿/, "")); // drop Excel's byte-order mark
  if (rows.length < 2) return { error: "The file has no rows to import. The first row must be a header like: name,city,website" };
  if (rows.length - 1 > MAX_IMPORT_ROWS) return { error: `That file has more than ${MAX_IMPORT_ROWS} rows. Split it into smaller files.` };

  const columns = rows[0].map((h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? null);
  if (!columns.includes("name")) return { error: "The header row needs a 'name' column (also accepted: company, company name)." };

  const report: ImportReport = { added: 0, duplicates: [], filtered: [], failed: [] };
  const names = new Set(state.companies.map((c) => c.name.toLowerCase()));
  const hosts = new Set(state.companies.map((c) => host(c.website)).filter(Boolean));
  const added: Company[] = [];

  rows.slice(1).forEach((cells, i) => {
    const rowNumber = i + 2; // as shown in a spreadsheet, header = row 1
    const obj: Record<string, string> = {};
    columns.forEach((col, j) => {
      if (col) obj[col] = cells[j] ?? "";
    });
    const parsed = rowSchema.safeParse(obj);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      report.failed.push({ row: rowNumber, reason: `${String(issue.path[0] ?? "row")} ${issue.message}` });
      return;
    }
    const r = parsed.data;
    if (isNonSoftware(r.expertise)) {
      report.filtered.push(r.name);
      return;
    }
    const h = host(r.website);
    if (names.has(r.name.toLowerCase()) || (h && hosts.has(h))) {
      report.duplicates.push(r.name);
      return;
    }
    names.add(r.name.toLowerCase());
    if (h) hosts.add(h);
    added.push({
      id: newId(),
      name: r.name,
      city: r.city,
      website: r.website,
      careersUrl: r.careersUrl,
      hiringEmail: r.hiringEmail,
      careersStatus: r.careersUrl ? "careers_page" : r.hiringEmail ? "email_only" : "not_checked",
      lastChecked: null,
      failures: 0,
      createdAt: now.toISOString(),
    });
  });

  report.added = added.length;
  return { state: { ...state, companies: [...state.companies, ...added] }, report };
}
