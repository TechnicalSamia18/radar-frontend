// Shape of the files the daily watcher publishes (public/feed/*.json).
// They're checked with Zod before use: a broken or tampered file shows an
// error instead of bad data.
import { z } from "zod";

const iso = z.string().max(40);
const httpUrl = z.url({ protocol: /^https?$/ }).max(600);

export const feedItemSchema = z.object({
  id: z.string().min(1).max(200),
  companyName: z.string().min(1).max(120),
  companyCity: z.string().max(60).nullable(),
  title: z.string().min(1).max(160),
  location: z.string().max(200),
  url: httpUrl,
  postedAt: iso.nullable(),
  firstSeen: iso,
  description: z.string().max(10_000),
  source: z.string().max(40),
});
export type FeedItem = z.infer<typeof feedItemSchema>;

export const openingsFeedSchema = z.object({
  generatedAt: iso,
  complete: z.boolean(),
  items: z.array(feedItemSchema).max(5_000),
});
export type OpeningsFeed = z.infer<typeof openingsFeedSchema>;

export const WATCH_SOURCES = ["feed", "careers_page", "email_only", "nothing_found", "unreachable", "blocked"] as const;

export const watchedCompanySchema = z.object({
  name: z.string().min(1).max(120),
  city: z.string().max(60).nullable(),
  website: httpUrl,
  careersUrl: httpUrl.nullable(),
  platform: z.string().max(40).nullable(),
  source: z.enum(WATCH_SOURCES),
  openings: z.number().int().min(0),
  emails: z.array(z.string().max(200)).max(10),
  pageHash: z.string().max(64).nullable(),
  pageChangedAt: iso.nullable(),
  possibleRoles: z.array(z.string().max(120)).max(20),
  imageAd: z.boolean(),
  lastChecked: iso,
  failures: z.number().int().min(0),
  note: z.string().max(300).nullable(),
});
export type WatchedCompany = z.infer<typeof watchedCompanySchema>;

export const companiesFeedSchema = z.object({
  generatedAt: iso,
  complete: z.boolean(),
  companies: z.array(watchedCompanySchema).max(5_000),
});
export type CompaniesFeed = z.infer<typeof companiesFeedSchema>;
