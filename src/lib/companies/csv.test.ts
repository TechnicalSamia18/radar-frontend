import { describe, expect, it } from "vitest";
import { EMPTY_STATE, radarStateSchema } from "@/lib/data/schema";
import { CSV_TEMPLATE, importCompanies, isNonSoftware, parseCsv } from "./csv";

const NOW = new Date("2026-11-05T09:00:00+05:00");
let n = 0;
const id = () => `c${++n}`;

function run(text: string, state = EMPTY_STATE) {
  const r = importCompanies(state, text, NOW, id);
  if ("error" in r) throw new Error(r.error);
  return r;
}

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, commas inside quotes and CRLF", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\n')).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["1", "2", "3"],
    ]);
  });
  it("skips blank lines", () => {
    expect(parseCsv("a\n\n\nb\n")).toEqual([["a"], ["b"]]);
  });
});

describe("importCompanies", () => {
  it("imports the template", () => {
    const { state, report } = run(CSV_TEMPLATE);
    expect(report).toEqual({ added: 1, duplicates: [], filtered: [], failed: [] });
    expect(state.companies[0]).toMatchObject({ name: "Nimbus Labs", careersStatus: "careers_page" });
    expect(radarStateSchema.safeParse(state).success).toBe(true);
  });

  it("imports 50 companies and reports duplicates (REQ-001)", () => {
    const rows = Array.from({ length: 50 }, (_, i) => `Company ${i},Lahore,https://co${i}.example.com`);
    const text = "name,city,website\n" + rows.join("\n") + "\nCompany 3,Lahore,https://other.example.com\nNew Name,Lahore,https://www.co4.example.com";
    const { state, report } = run(text);
    expect(report.added).toBe(50);
    expect(state.companies).toHaveLength(50);
    expect(report.duplicates).toEqual(["Company 3", "New Name"]); // same name / same website
  });

  it("skips companies already in Radar", () => {
    const first = run(CSV_TEMPLATE).state;
    expect(run(CSV_TEMPLATE, first).report).toMatchObject({ added: 0, duplicates: ["Nimbus Labs"] });
  });

  it("filters out BPOs, call centres and marketing-only firms (REQ-004)", () => {
    const text = "name,expertise\nCallCo,Call center / BPO\nAdsCo,Digital marketing\nHybridCo,Web development and digital marketing\nDevCo,Software development";
    const { report } = run(text);
    expect(report.filtered).toEqual(["CallCo", "AdsCo"]);
    expect(report.added).toBe(2);
  });

  it("imports valid rows and explains each bad row (PRD §4)", () => {
    const text = "name,website,hiring_email\nGood Co,https://good.example.com,\n,https://noname.example.com,\nBad Link,javascript:alert(1),\nBad Mail,,hr@@x";
    const { report } = run(text);
    expect(report.added).toBe(1);
    expect(report.failed).toEqual([
      { row: 3, reason: "name has no company name" },
      { row: 4, reason: "website isn't a full http(s) link" },
      { row: 5, reason: "hiringEmail has an invalid email" },
    ]);
  });

  it("accepts common header names and Excel's byte-order mark", () => {
    const { report } = run("﻿Company Name,Location,URL\nAcme,Karachi,https://acme.example.com");
    expect(report.added).toBe(1);
  });

  it("rejects files without a name column, empty files, and oversized files", () => {
    expect(importCompanies(EMPTY_STATE, "city,website\nLahore,https://x.example.com", NOW, id)).toHaveProperty("error");
    expect(importCompanies(EMPTY_STATE, "name\n", NOW, id)).toHaveProperty("error");
    expect(importCompanies(EMPTY_STATE, "x".repeat(1024 * 1024 + 1), NOW, id)).toHaveProperty("error");
  });

  it("keeps formula-looking names as plain text", () => {
    const { state } = run("name\n=HYPERLINK(\"http://evil\")");
    expect(state.companies[0].name).toBe('=HYPERLINK("http://evil")');
  });
});

describe("isNonSoftware", () => {
  it("only filters when nothing software-related is mentioned", () => {
    expect(isNonSoftware("BPO")).toBe(true);
    expect(isNonSoftware("BPO and software development")).toBe(false);
    expect(isNonSoftware(null)).toBe(false);
  });
});
