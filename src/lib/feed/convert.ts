// Turns a live opening from the watcher into the same shape as an opening
// you added yourself, so fit scores, warnings and filters work the same.
import type { Opening } from "@/lib/data/schema";
import { extractOpening } from "@/lib/openings/extract";
import { CITIES } from "@/lib/profile/options";
import type { FeedItem } from "./schema";

function cityFrom(location: string): string | null {
  return CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(location)) ?? null;
}

function workModeFrom(location: string): Opening["workMode"] {
  if (/\bhybrid\b/i.test(location)) return "hybrid";
  if (/\b(remote|anywhere)\b/i.test(location)) return "remote";
  if (/\b(on-?site|in-?office|in-person)\b/i.test(location)) return "onsite";
  return null;
}

export function feedItemToOpening(item: FeedItem, now: Date = new Date()): Opening {
  // Structured fields from the hiring platform win; the description fills in the rest.
  const read = extractOpening(`${item.title}\n${item.location}\n${item.description}`, now);
  const type = /\b(intern(ship)?|trainee)\b/i.test(item.title) ? "internship" : "job";
  return {
    id: item.id.slice(0, 40),
    companyId: null,
    companyName: item.companyName,
    title: item.title,
    type,
    // No city in the post = "Not stated" (we don't assume the head office).
    location: cityFrom(item.location) ?? read.location,
    workMode: workModeFrom(item.location) ?? read.workMode,
    skills: read.skills,
    experienceYears: /\b(entry[- ]level|fresh(er)?s?|graduate program)\b/i.test(item.title) ? 0 : read.experienceYears,
    graduatesOnly: read.graduatesOnly,
    minCgpa: read.minCgpa,
    deadline: read.deadline,
    deadlineText: read.deadlineText,
    deadlineStatus: read.deadlineStatus,
    applyUrl: item.url,
    applyEmail: null,
    sourceUrl: item.url,
    adKind: "text",
    rawText: item.description,
    firstSeen: item.firstSeen,
    status: "saved",
    statusHistory: [{ status: "saved", at: now.toISOString() }],
    notes: "",
  };
}

/** Whether the watcher first saw this opening in the last `days` days. */
export function isFresh(item: FeedItem, now: Date, days = 3): boolean {
  return now.getTime() - new Date(item.firstSeen).getTime() < days * 24 * 60 * 60 * 1000;
}
