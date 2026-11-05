import { describe, expect, it } from "vitest";
import { buildDemoState } from "@/lib/data/demo";
import { radarStateSchema } from "@/lib/data/schema";
import { dashboardStats, markPastDeadlines, needsFollowUp, rankOpenings, setNotes, setStatus } from "./tracker";

const NOW = new Date("2026-11-05T09:00:00+05:00");
const demo = buildDemoState(NOW);
const byId = (s: typeof demo, id: string) => s.openings.find((o) => o.id === id)!;

describe("demo data", () => {
  it("is valid stored state and covers every company status", () => {
    expect(radarStateSchema.safeParse(demo).success).toBe(true);
    expect(new Set(demo.companies.map((c) => c.careersStatus))).toEqual(
      new Set(["careers_page", "email_only", "unreachable", "blocked", "nothing_found"]),
    );
  });
});

describe("tracker", () => {
  it("records each status change with its date (REQ-061)", () => {
    const later = new Date("2026-11-06T10:00:00+05:00");
    const s = setStatus(demo, "d1", "applied", later);
    expect(byId(s, "d1").status).toBe("applied");
    expect(byId(s, "d1").statusHistory.at(-1)).toEqual({ status: "applied", at: later.toISOString() });
    expect(byId(demo, "d1").status).toBe("saved"); // original untouched
  });

  it("ignores setting the same status twice", () => {
    expect(setStatus(demo, "d1", "saved", NOW)).toEqual(demo);
  });

  it("flags applications with no update for 7+ days (REQ-062)", () => {
    expect(needsFollowUp(byId(demo, "d5"), NOW)).toBe(true); // applied 9 days ago
    expect(needsFollowUp(byId(demo, "d6"), NOW)).toBe(false); // interview, not applied
    const fresh = setStatus(demo, "d1", "applied", NOW);
    expect(needsFollowUp(byId(fresh, "d1"), NOW)).toBe(false);
  });

  it("keeps notes, capped at 5,000 characters (REQ-063)", () => {
    expect(byId(setNotes(demo, "d1", "x".repeat(6000)), "d1").notes).toHaveLength(5000);
  });

  it("moves saved openings past their deadline to Missed, once", () => {
    const later = new Date(NOW.getTime() + 20 * 24 * 60 * 60 * 1000);
    const s = markPastDeadlines(demo, later);
    expect(byId(s, "d1").status).toBe("missed"); // deadline was 15 days out
    expect(byId(s, "d2").status).toBe("saved"); // date flagged "check": not trusted, not moved
    expect(markPastDeadlines(s, later)).toBe(s); // nothing more to change → same object
  });

  it("counts the dashboard numbers", () => {
    expect(dashboardStats(demo, NOW)).toEqual({ newThisWeek: 4, goodFit: 3, applied: 2, followUp: 1 });
  });

  it("ranks saved openings by fit, unknown fit last", () => {
    expect(rankOpenings(demo, NOW).map((o) => o.id)).toEqual(["d1", "d2", "d3", "d4"]);
  });
});
