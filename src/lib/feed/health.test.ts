import { describe, expect, it } from "vitest";
import { feedProblems } from "./health";
import type { CompaniesFeed, OpeningsFeed, WatchedCompany } from "./schema";

const NOW = new Date("2026-11-05T12:00:00Z");
const company = (source: WatchedCompany["source"]): WatchedCompany => ({
  name: `Co ${Math.random()}`, city: null, website: "https://x.example.com", careersUrl: null, platform: null, source, openings: 0,
  emails: [], pageHash: null, pageChangedAt: null, possibleRoles: [], imageAd: false, lastChecked: NOW.toISOString(), failures: 0, note: null,
});
const feeds = (generatedAt: string, list: WatchedCompany[], complete = true): [OpeningsFeed, CompaniesFeed] => [
  { generatedAt, complete, items: [] },
  { generatedAt, complete, companies: list },
];

describe("feedProblems", () => {
  it("is quiet when the last check was recent, complete and mostly reachable", () => {
    expect(feedProblems(...feeds("2026-11-05T01:17:00Z", [company("feed"), company("careers_page"), company("unreachable")]), NOW)).toEqual([]);
  });
  it("warns when the data is more than 2 days old", () => {
    const p = feedProblems(...feeds("2026-11-01T01:17:00Z", [company("feed")]), NOW);
    expect(p[0]).toMatch(/last checked 4 days ago/);
  });
  it("warns when the last check checked no companies (the bug from the first run)", () => {
    expect(feedProblems(...feeds("2026-11-05T01:17:00Z", []), NOW)).toEqual(["The last check didn't include any companies."]);
  });
  it("warns when the check stopped early", () => {
    expect(feedProblems(...feeds("2026-11-05T01:17:00Z", [company("feed")], false), NOW)[0]).toMatch(/stopped before finishing/);
  });
  it("warns when most companies couldn't be reached", () => {
    expect(feedProblems(...feeds("2026-11-05T01:17:00Z", [company("unreachable"), company("unreachable"), company("feed")]), NOW)).toEqual([
      "2 of 3 companies couldn't be reached on the last check.",
    ]);
  });
});
