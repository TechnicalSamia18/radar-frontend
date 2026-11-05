"use client";
// Live openings: real postings the daily watcher found on companies' public
// job feeds, scored against your profile. Save the ones you want to track.
import Link from "next/link";
import { useState } from "react";
import { DataGate, PageHeader } from "@/components/data-gate";
import { FeedHealth } from "@/components/feed-health";
import { AlertIcon } from "@/components/icons";
import { LiveCard } from "@/components/live-card";
import type { RadarState } from "@/lib/data/schema";
import { newId, update } from "@/lib/data/store";
import { dismissFeedItem, saveFeedItem, savedOpeningId, undismissFeedItem } from "@/lib/feed/actions";
import { feedItemToOpening, isFresh } from "@/lib/feed/convert";
import type { FeedItem } from "@/lib/feed/schema";
import { useFeed } from "@/lib/feed/use-feed";
import { matchOpening, type FitLevel } from "@/lib/openings/match";

export function LiveView() {
  return (
    <div className="mx-auto max-w-5xl">
      <DataGate>{(state) => <Live state={state} />}</DataGate>
    </div>
  );
}

export function formatChecked(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" });
}

type LiveFilters = { q: string; type: "" | "internship" | "job"; fit: "" | FitLevel | "unknown"; entry: boolean; showHidden: boolean };
const NO_FILTERS: LiveFilters = { q: "", type: "", fit: "", entry: false, showHidden: false };
const ENTRY = /\b(intern(ship)?|trainee|junior|jr\.?|associate|entry[- ]level|graduate|fresh(er)?|i)\b/i;

function Live({ state }: { state: RadarState }) {
  const feed = useFeed();
  const [now] = useState(() => new Date());
  const [f, setF] = useState<LiveFilters>(NO_FILTERS);
  const [notice, setNotice] = useState<{ text: string; undo?: () => void } | null>(null);

  if (feed.status === "loading") {
    return (
      <>
        <PageHeader label="Live openings" title="Found by the daily watcher" />
        <div role="status" aria-label="Loading live openings" className="mt-8 animate-pulse space-y-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-36 bg-beige" />)}
        </div>
      </>
    );
  }
  if (feed.status === "error") {
    return (
      <>
        <PageHeader label="Live openings" title="Found by the daily watcher" />
        <div role="alert" className="mt-8 max-w-xl border border-danger/40 bg-paper p-6">
          <p className="flex items-center gap-2 text-danger"><AlertIcon className="h-5 w-5" /> {feed.message}</p>
          <button type="button" onClick={feed.retry} className="label-caps mt-5 bg-evening px-6 py-3 text-beige hover:bg-stormy">Try again</button>
        </div>
      </>
    );
  }

  const { openings, companies } = feed;
  const withFeeds = companies.companies.filter((c) => c.source === "feed").length;
  const hidden = new Set(state.dismissedFeedIds);

  const rows = openings.items
    .map((item) => {
      const opening = feedItemToOpening(item, now);
      return { item, opening, fit: matchOpening(opening, state.profile, now) };
    })
    .filter(({ item, opening, fit }) => {
      if (!f.showHidden && hidden.has(item.id)) return false;
      if (f.showHidden && !hidden.has(item.id)) return false;
      if (f.q && !`${item.title} ${item.companyName}`.toLowerCase().includes(f.q.trim().toLowerCase())) return false;
      if (f.type && opening.type !== f.type) return false;
      if (f.entry && !ENTRY.test(item.title)) return false;
      if (f.fit === "unknown" && fit.kind !== "unknown") return false;
      if (f.fit && f.fit !== "unknown" && (fit.kind !== "scored" || fit.level !== f.fit)) return false;
      return true;
    })
    .sort((a, b) => {
      const s = (r: typeof a) => (r.fit.kind === "scored" ? r.fit.score : -1);
      return s(b) - s(a) || b.item.firstSeen.localeCompare(a.item.firstSeen);
    });

  function save(item: FeedItem) {
    const r = update((s) => saveFeedItem(s, item, newId(), new Date()).state);
    setNotice(r.ok ? { text: `Saved "${item.title}" to your openings. Track it there.` } : { text: r.message });
  }
  function dismiss(item: FeedItem) {
    const r = update((s) => dismissFeedItem(s, item.id));
    setNotice(r.ok ? { text: `Hidden "${item.title}".`, undo: () => { update((s) => undismissFeedItem(s, item.id)); setNotice(null); } } : { text: r.message });
  }
  const set = <K extends keyof LiveFilters>(k: K, v: LiveFilters[K]) => setF((p) => ({ ...p, [k]: v }));
  const filtered = JSON.stringify(f) !== JSON.stringify(NO_FILTERS);

  return (
    <>
      <PageHeader label="Live openings" title="Found by the daily watcher">
        Real openings from {withFeeds} compan{withFeeds === 1 ? "y" : "ies"} that publish their jobs openly (in Pakistan or open-remote, tech roles
        only). Checked {formatChecked(openings.generatedAt)}.{" "}
        <Link href="/companies" className="underline">See all {companies.companies.length} watched companies</Link>
      </PageHeader>

      {!state.profile && (
        <p className="mt-6 border border-line bg-paper p-4 text-stormy">
          Add your resume to see how well you fit each one. <Link href="/profile" className="text-evening underline">Upload your resume</Link>
        </p>
      )}
      <FeedHealth openings={openings} companies={companies} now={now} />

      <form role="search" aria-label="Filter live openings" onSubmit={(e) => e.preventDefault()} className="mt-6 flex flex-wrap items-end gap-3 border border-line bg-paper p-4">
        <div className="min-w-48 flex-1">
          <label htmlFor="live-q" className="label-caps text-stormy">Search</label>
          <input id="live-q" type="search" value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Title or company" className="input mt-1" />
        </div>
        <div>
          <label htmlFor="live-type" className="label-caps text-stormy">Type</label>
          <select id="live-type" value={f.type} onChange={(e) => set("type", e.target.value as LiveFilters["type"])} className="input mt-1">
            <option value="">All</option>
            <option value="internship">Internships</option>
            <option value="job">Jobs</option>
          </select>
        </div>
        <div>
          <label htmlFor="live-fit" className="label-caps text-stormy">Fit</label>
          <select id="live-fit" value={f.fit} onChange={(e) => set("fit", e.target.value as LiveFilters["fit"])} className="input mt-1">
            <option value="">Any fit</option>
            <option value="good">Good (70%+)</option>
            <option value="fair">Fair</option>
            <option value="low">Low</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2">
          <input type="checkbox" checked={f.entry} onChange={(e) => set("entry", e.target.checked)} className="accent-sunset" /> Entry-level only
        </label>
        <label className="flex items-center gap-2 pb-2 text-stormy">
          <input type="checkbox" checked={f.showHidden} onChange={(e) => set("showHidden", e.target.checked)} className="accent-sunset" /> Show hidden ({state.dismissedFeedIds.filter((d) => openings.items.some((i) => i.id === d)).length})
        </label>
      </form>

      <div aria-live="polite" className="mt-4 flex min-h-6 flex-wrap items-center justify-between gap-3 text-sm text-stormy">
        <p>
          {notice ? (
            <>
              {notice.text}{" "}
              {notice.undo && <button type="button" onClick={notice.undo} className="text-evening underline">Undo</button>}
            </>
          ) : (
            `Showing ${rows.length} of ${openings.items.length} live openings`
          )}
        </p>
        {filtered && <button type="button" onClick={() => setF(NO_FILTERS)} className="underline">Clear filters</button>}
      </div>

      {openings.items.length === 0 ? (
        <div className="mt-4 border border-dashed border-cloud bg-paper p-8">
          <h2 className="text-xl font-normal">No live openings right now</h2>
          <p className="mt-2 text-stormy">None of the watched companies has a matching opening on its public job feed today. The watcher checks again tomorrow morning.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4 border border-dashed border-cloud bg-paper p-8 text-center">
          <p className="text-lg">{f.showHidden ? "You haven't hidden any openings." : "No live openings match these filters."}</p>
          <button type="button" onClick={() => setF(NO_FILTERS)} className="label-caps mt-4 border border-evening px-6 py-3 hover:bg-evening hover:text-beige">Clear filters</button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.map(({ item, opening, fit }) => (
            <LiveCard
              key={item.id}
              item={item}
              opening={opening}
              fit={fit}
              fresh={isFresh(item, now)}
              savedId={savedOpeningId(state, item.id)}
              onSave={() => save(item)}
              onDismiss={() => dismiss(item)}
            />
          ))}
        </div>
      )}
    </>
  );
}
