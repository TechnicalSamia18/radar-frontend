import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/companies/csv";
import { buildDemoState } from "@/lib/data/demo";
import { activeFilterCount, filterOpenings, NO_FILTERS } from "./filter";
import { companiesCsv, csvCell, neutralise, openingsCsv } from "./export";

const NOW = new Date("2026-11-05T09:00:00+05:00");
const demo = buildDemoState(NOW);
const ids = (f: Partial<typeof NO_FILTERS>, sort: "fit" | "deadline" | "newest" = "fit") =>
  filterOpenings(demo.openings, demo.profile, { ...NO_FILTERS, ...f }, sort, NOW).map((r) => r.opening.id);

describe("filterOpenings (REQ-051)", () => {
  it("shows active openings by default, best fit first", () => {
    expect(ids({})).toEqual(["d1", "d2", "d5", "d6", "d3", "d4"]);
  });
  it("combines filters", () => {
    expect(ids({ city: "Lahore" })).toEqual(["d1", "d6"]);
    expect(ids({ city: "Lahore", workMode: "hybrid" })).toEqual(["d1"]);
    expect(ids({ type: "job" })).toEqual(["d3"]);
    expect(ids({ fit: "good" })).toEqual(["d1", "d2", "d5"]);
    expect(ids({ fit: "unknown" })).toEqual(["d4"]);
    expect(ids({ newOnly: true })).toEqual(["d1", "d2", "d3", "d4"]);
    expect(ids({ status: "missed" })).toEqual(["d7"]);
    expect(ids({ status: "" })).toHaveLength(7);
    expect(ids({ q: "orchid" })).toEqual(["d2"]);
  });
  it("returns nothing when filters exclude everything", () => {
    expect(ids({ city: "Quetta" })).toEqual([]);
  });
  it("sorts by deadline (none last) and by newest", () => {
    expect(ids({}, "deadline").slice(0, 2)).toEqual(["d2", "d1"]);
    expect(ids({}, "newest")[0]).toBe("d4");
  });
  it("counts active filters", () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...NO_FILTERS, city: "Lahore", newOnly: true })).toBe(2);
  });
});

describe("CSV export (REQ-052)", () => {
  it("neutralises cells that Excel would run as formulas", () => {
    for (const bad of ["=HYPERLINK(\"http://evil\")", "+1+1", "-2+3", "@SUM(A1)", "\tx", "\rx"]) {
      expect(neutralise(bad).startsWith("'")).toBe(true);
    }
    expect(neutralise("React developer")).toBe("React developer");
  });
  it("quotes commas, quotes and new lines", () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell(null)).toBe("");
  });
  it("exports every opening with a header row that round-trips", () => {
    const rows = parseCsv(openingsCsv(demo, NOW).replace(/^﻿/, ""));
    expect(rows[0][0]).toBe("Company");
    expect(rows).toHaveLength(1 + demo.openings.length);
    const nimbus = rows.find((r) => r[1] === "Frontend Intern (React)")!;
    expect(nimbus.slice(0, 6)).toEqual(["Nimbus Labs", "Frontend Intern (React)", "internship", "Lahore", "hybrid", "100%"]);
  });
  it("neutralises a formula planted in a job title", () => {
    const evil = { ...demo, openings: [{ ...demo.openings[0], title: '=cmd|"/c calc"!A1' }] };
    const rows = parseCsv(openingsCsv(evil, NOW).replace(/^﻿/, ""));
    expect(rows[1][1]).toBe("'=cmd|\"/c calc\"!A1");
  });
  it("exports companies", () => {
    const rows = parseCsv(companiesCsv(demo).replace(/^﻿/, ""));
    expect(rows).toHaveLength(1 + demo.companies.length);
  });
});
