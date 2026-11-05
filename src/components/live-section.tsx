"use client";
// Dashboard pieces that come from the daily watcher: best live matches,
// careers pages that changed, and the watched-companies status list.
import Link from "next/link";
import { useState } from "react";
import { FeedHealth } from "@/components/feed-health";
import { AlertIcon, ExternalIcon, RadarMark } from "@/components/icons";
import { LiveCard } from "@/components/live-card";
import type { RadarState } from "@/lib/data/schema";
import { newId, update } from "@/lib/data/store";
import { dismissFeedItem, saveFeedItem, savedOpeningId } from "@/lib/feed/actions";
import { feedItemToOpening, isFresh } from "@/lib/feed/convert";
import { checkedAgo } from "@/lib/feed/health";
import type { WatchedCompany } from "@/lib/feed/schema";
import { useFeed } from "@/lib/feed/use-feed";
import { matchOpening } from "@/lib/openings/match";

const DAY = 24 * 60 * 60 * 1000;

export function watchStatus(c: WatchedCompany, now: Date): { text: string; tone: "ok" | "muted" | "bad" | "accent" } {
  if (c.source === "feed") return c.openings > 0 ? { text: `${c.openings} live opening${c.openings === 1 ? "" : "s"} · ${c.platform}`, tone: "accent" } : { text: `No openings right now · ${c.platform}`, tone: "muted" };
  if (c.source === "careers_page") {
    if (c.pageChangedAt && now.getTime() - new Date(c.pageChangedAt).getTime() < 7 * DAY) return { text: "Careers page changed. Have a look", tone: "accent" };
    return { text: c.imageAd ? "Careers page · has an image job ad" : "Careers page · watching for changes", tone: "ok" };
  }
  if (c.source === "email_only") return { text: `Email only · ${c.emails[0] ?? ""}`, tone: "ok" };
  if (c.source === "blocked") return { text: "Site doesn't allow automated checks. Check it yourself", tone: "bad" };
  if (c.source === "unreachable") return c.failures >= 3 ? { text: `Couldn't reach the site ${c.failures} days running. Check the link`, tone: "bad" } : { text: "Couldn't reach the site; retrying tomorrow", tone: "bad" };
  return { text: "No careers info found", tone: "muted" };
}

export const WATCH_TONE = { ok: "text-stormy", muted: "text-cloud", bad: "text-danger", accent: "text-sunset" } as const;

export function LiveSection({ state, now }: { state: RadarState; now: Date }) {
  const feed = useFeed();
  const [notice, setNotice] = useState<string | null>(null);

  if (feed.status === "loading") {
    return <div role="status" aria-label="Loading live openings" className="mt-8 h-40 animate-pulse bg-beige" />;
  }
  if (feed.status === "error") {
    return (
      <p role="alert" className="mt-8 flex flex-wrap items-center gap-3 border border-danger/40 bg-paper p-4 text-danger">
        <AlertIcon className="h-4 w-4" /> {feed.message}
        <button type="button" onClick={feed.retry} className="text-evening underline">Try again</button>
      </p>
    );
  }

  const { openings, companies } = feed;
  const hidden = new Set(state.dismissedFeedIds);
  const best = openings.items
    .filter((i) => !hidden.has(i.id) && !savedOpeningId(state, i.id))
    .map((item) => {
      const opening = feedItemToOpening(item, now);
      return { item, opening, fit: matchOpening(opening, state.profile, now) };
    })
    .sort((a, b) => (b.fit.kind === "scored" ? b.fit.score : -1) - (a.fit.kind === "scored" ? a.fit.score : -1) || b.item.firstSeen.localeCompare(a.item.firstSeen))
    .slice(0, 3);
  const fresh = openings.items.filter((i) => isFresh(i, now)).length;
  const changed = companies.companies.filter((c) => c.source === "careers_page" && c.pageChangedAt && now.getTime() - new Date(c.pageChangedAt).getTime() < 7 * DAY);
  const checkedAt = new Date(openings.generatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" });

  return (
    <section aria-labelledby="live-h" className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="live-h" className="label-caps flex items-center gap-2 text-stormy">
          <RadarMark className="h-4 w-4 text-sunset" /> Live openings for you
        </h2>
        <p className="text-sm text-stormy">
          Watching {companies.companies.length} companies · checked{" "}
          <time dateTime={openings.generatedAt} title={checkedAt}>{checkedAgo(openings.generatedAt, now)}</time> ({checkedAt})
          {fresh > 0 && <span className="text-sunset"> · {fresh} new in the last 3 days</span>}
        </p>
      </div>
      <FeedHealth openings={openings} companies={companies} now={now} />
      <p aria-live="polite" className="min-h-6 text-sm text-stormy">{notice}</p>
      {best.length === 0 ? (
        <p className="border border-dashed border-cloud bg-paper p-6 text-stormy">
          You&apos;ve saved or hidden every live opening. <Link href="/live" className="text-evening underline">See them all</Link>
        </p>
      ) : (
        <div className="space-y-4">
          {best.map(({ item, opening, fit }) => (
            <LiveCard
              key={item.id}
              item={item}
              opening={opening}
              fit={fit}
              fresh={isFresh(item, now)}
              savedId={null}
              onSave={() => {
                const r = update((s) => saveFeedItem(s, item, newId(), new Date()).state);
                setNotice(r.ok ? `Saved "${item.title}". It's now in My openings.` : r.message);
              }}
              onDismiss={() => {
                const r = update((s) => dismissFeedItem(s, item.id));
                setNotice(r.ok ? `Hidden "${item.title}".` : r.message);
              }}
            />
          ))}
          <Link href="/live" className="label-caps inline-block text-sunset hover:underline">See all {openings.items.length} live openings →</Link>
        </div>
      )}

      {changed.length > 0 && (
        <div className="mt-8">
          <h3 className="label-caps text-stormy">Careers pages that changed this week</h3>
          <ul className="mt-3 divide-y divide-line border border-line bg-paper">
            {changed.map((c) => (
              <li key={c.name} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                <span>
                  {c.name}
                  {c.possibleRoles.length > 0 && <span className="block text-sm text-stormy">Mentions: {c.possibleRoles.slice(0, 3).join(", ")}</span>}
                </span>
                {c.careersUrl && (
                  <a href={c.careersUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm underline">
                    Have a look <ExternalIcon className="h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** The watched-companies list on the dashboard: feeds with openings and changes first, problems next. */
export function WatchedCompanies({ now }: { now: Date }) {
  const feed = useFeed();
  if (feed.status !== "ready") return null;
  const rank = (c: WatchedCompany) => (c.source === "feed" && c.openings > 0 ? 0 : watchStatus(c, now).tone === "accent" ? 1 : watchStatus(c, now).tone === "bad" ? 2 : 3);
  const list = [...feed.companies.companies].sort((a, b) => rank(a) - rank(b) || b.openings - a.openings || a.name.localeCompare(b.name)).slice(0, 8);
  return (
    <section aria-labelledby="co-h" className="mt-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="co-h" className="label-caps text-stormy">Watched companies</h2>
        <Link href="/companies" className="text-sm underline">All {feed.companies.companies.length}</Link>
      </div>
      <ul className="mt-4 divide-y divide-line border border-line bg-paper">
        {list.map((c) => {
          const st = watchStatus(c, now);
          return (
            <li key={c.name} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span>{c.name}{c.city && <span className="text-stormy"> · {c.city}</span>}</span>
              <span className={`text-sm sm:text-right ${WATCH_TONE[st.tone]}`}>{st.text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
