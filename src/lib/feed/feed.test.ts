import { describe, expect, it } from "vitest";
import { EMPTY_STATE, radarStateSchema } from "@/lib/data/schema";
import { matchOpening } from "@/lib/openings/match";
import { dismissFeedItem, saveFeedItem, savedOpeningId, undismissFeedItem } from "./actions";
import { feedItemToOpening, isFresh } from "./convert";
import { openingsFeedSchema, type FeedItem } from "./schema";

const NOW = new Date("2026-11-05T10:00:00+05:00");

const item: FeedItem = {
  id: "workable:devsinc-17:ABC123",
  companyName: "Devsinc",
  companyCity: "Lahore",
  title: "Associate Software Engineer- MERN",
  location: "Islamabad · Pakistan",
  url: "https://apply.workable.com/devsinc-17/j/ABC123/",
  postedAt: "2026-11-01",
  firstSeen: "2026-11-05T01:20:00.000Z",
  description: "We need React, Node.js, MongoDB and Express. 0-1 years of experience. Fresh graduates welcome.",
  source: "Workable",
};

describe("feedItemToOpening", () => {
  it("uses the platform's fields and reads skills from the description", () => {
    const o = feedItemToOpening(item, NOW);
    expect(o).toMatchObject({ title: item.title, companyName: "Devsinc", type: "job", location: "Islamabad", applyUrl: item.url, experienceYears: 0 });
    expect(o.skills).toEqual(expect.arrayContaining(["React", "Node.js", "MongoDB", "Express"]));
  });
  it("marks internships and remote roles", () => {
    const o = feedItemToOpening({ ...item, title: "Frontend Intern", location: "Pakistan - Remote" }, NOW);
    expect(o).toMatchObject({ type: "internship", workMode: "remote", location: null });
  });
  it("is scored like any other opening", () => {
    const fit = matchOpening(feedItemToOpening(item, NOW), {
      skills: ["React", "Node.js"], semester: 5, graduationYear: 2028, cgpa: 3.6, cities: ["Islamabad"], remotePreference: "any", seeking: "both", resumeFileName: null, updatedAt: NOW.toISOString(),
    }, NOW);
    expect(fit.kind === "scored" && fit.has).toEqual(["React", "Node.js"]);
  });
  it("knows what's fresh", () => {
    expect(isFresh(item, NOW)).toBe(true);
    expect(isFresh({ ...item, firstSeen: "2026-10-01T00:00:00Z" }, NOW)).toBe(false);
  });
});

describe("saving and dismissing live openings", () => {
  it("saves once, links back, and keeps state valid", () => {
    const first = saveFeedItem(EMPTY_STATE, item, "o1", NOW);
    expect(first.state.openings).toHaveLength(1);
    expect(savedOpeningId(first.state, item.id)).toBe("o1");
    expect(radarStateSchema.safeParse(first.state).success).toBe(true);
    const again = saveFeedItem(first.state, item, "o2", NOW);
    expect(again.state.openings).toHaveLength(1);
    expect(again.openingId).toBe("o1");
  });
  it("forgets the link if you delete the saved opening", () => {
    const s = saveFeedItem(EMPTY_STATE, item, "o1", NOW).state;
    expect(savedOpeningId({ ...s, openings: [] }, item.id)).toBeNull();
  });
  it("dismisses and undoes", () => {
    const d = dismissFeedItem(EMPTY_STATE, item.id);
    expect(d.dismissedFeedIds).toEqual([item.id]);
    expect(dismissFeedItem(d, item.id)).toBe(d);
    expect(undismissFeedItem(d, item.id).dismissedFeedIds).toEqual([]);
  });
});

describe("feed file validation", () => {
  it("rejects a feed with a javascript: link", () => {
    const bad = { generatedAt: "x", complete: true, items: [{ ...item, url: "javascript:alert(1)" }] };
    expect(openingsFeedSchema.safeParse(bad).success).toBe(false);
  });
});
