import { describe, expect, it } from "vitest";
import { buildDemoState } from "@/lib/data/demo";
import { EMPTY_STATE, radarStateSchema } from "@/lib/data/schema";
import { openingsCsv } from "./export";
import { importOpenings } from "./import";

const NOW = new Date("2026-11-05T12:00:00+05:00");
let n = 0;
const id = () => `imp${++n}`;
const demo = buildDemoState(NOW);

function run(text: string, state = EMPTY_STATE) {
  const r = importOpenings(state, text, NOW, id);
  if ("error" in r) throw new Error(r.error);
  return r;
}

describe("importOpenings", () => {
  it("restores an export into an empty Radar: same openings, statuses, notes and details", () => {
    const { state, report } = run(openingsCsv(demo, NOW));
    expect(report).toEqual({ added: 7, duplicates: [], failed: [] });
    expect(radarStateSchema.safeParse(state).success).toBe(true);
    for (const original of demo.openings) {
      const restored = state.openings.find((o) => o.title === original.title && o.companyName === original.companyName)!;
      expect(restored, original.title).toMatchObject({
        type: original.type,
        location: original.location,
        workMode: original.workMode,
        skills: original.skills,
        experienceYears: original.experienceYears,
        graduatesOnly: original.graduatesOnly,
        minCgpa: original.minCgpa,
        deadline: original.deadline,
        deadlineStatus: original.deadlineStatus,
        applyUrl: original.applyUrl,
        applyEmail: original.applyEmail,
        status: original.status,
        notes: original.notes,
      });
    }
  });

  it("skips openings already in Radar instead of duplicating them", () => {
    const { report } = run(openingsCsv(demo, NOW), demo);
    expect(report.added).toBe(0);
    expect(report.duplicates).toHaveLength(7);
  });

  it("restores a formula-looking title exactly (undoes the export's protection)", () => {
    const evil = { ...demo, openings: [{ ...demo.openings[0], title: "=SUM(A1)" }] };
    const { state } = run(openingsCsv(evil, NOW));
    expect(state.openings[0].title).toBe("=SUM(A1)");
  });

  it("reads older exports without the extra columns (skills rebuilt from Has + Missing)", () => {
    const old = "Company,Title,Type,City,Has,Missing,Status\nNimbus Labs,Frontend Intern,internship,Lahore,React; Git,TypeScript,Applied\n";
    const { state } = run(old);
    expect(state.openings[0]).toMatchObject({ skills: ["React", "Git", "TypeScript"], status: "applied", location: "Lahore" });
  });

  it("imports good rows and explains each bad one", () => {
    const text =
      "Company,Title,Status,Apply link,Minimum CGPA\n" +
      "Good Co,Developer,Saved,https://good.example.com,\n" +
      ",No company,Saved,,\n" +
      "Bad Co,Bad link,Saved,javascript:alert(1),\n" +
      "Bad Co,Bad CGPA,Saved,,4.5\n" +
      "Bad Co,Bad status,Hired,,\n";
    const { report } = run(text);
    expect(report.added).toBe(1);
    expect(report.failed.map((f) => f.row)).toEqual([3, 4, 5, 6]);
    expect(report.failed[3].reason).toBe('unknown status "Hired"');
  });

  it("refuses files that aren't openings exports", () => {
    expect(importOpenings(EMPTY_STATE, "name,city\nAcme,Lahore", NOW, id)).toHaveProperty("error");
    expect(importOpenings(EMPTY_STATE, "Company,Title\n", NOW, id)).toHaveProperty("error");
    expect(importOpenings(EMPTY_STATE, "x".repeat(2 * 1024 * 1024 + 1), NOW, id)).toHaveProperty("error");
  });
});
