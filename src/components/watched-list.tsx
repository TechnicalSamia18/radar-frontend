"use client";
// Companies the daily watcher checks (data/companies.json), with what it found.
import { ExternalIcon } from "@/components/icons";
import { WATCH_TONE, watchStatus } from "@/components/live-section";
import type { WatchedCompany } from "@/lib/feed/schema";
import { useFeed } from "@/lib/feed/use-feed";

const EDIT_URL = "https://github.com/TechnicalSamia18/radar-frontend/edit/main/data/companies.json";
const ORDER = { feed: 0, careers_page: 1, email_only: 2, unreachable: 3, blocked: 4, nothing_found: 5 } as const;

export function WatchedList({ now }: { now: Date }) {
  const feed = useFeed();
  if (feed.status === "loading") return <div role="status" aria-label="Loading watched companies" className="mt-6 h-40 animate-pulse bg-beige" />;
  if (feed.status === "error") {
    return (
      <p role="alert" className="mt-6 border border-danger/40 bg-paper p-4 text-danger">
        {feed.message} <button type="button" onClick={feed.retry} className="text-evening underline">Try again</button>
      </p>
    );
  }
  const list = [...feed.companies.companies].sort((a, b) => ORDER[a.source] - ORDER[b.source] || b.openings - a.openings || a.name.localeCompare(b.name));
  const count = (s: WatchedCompany["source"]) => list.filter((c) => c.source === s).length;

  return (
    <section aria-labelledby="watched-h" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="watched-h" className="label-caps text-stormy">Checked every morning ({list.length})</h2>
          <p className="mt-1 text-sm text-stormy">
            {count("feed")} with a public job feed · {count("careers_page")} careers pages watched for changes · {count("unreachable") + count("blocked")} can&apos;t be checked · {count("nothing_found")} with no careers info
          </p>
        </div>
        <a href={EDIT_URL} target="_blank" rel="noopener noreferrer" className="label-caps inline-flex items-center gap-2 border border-evening px-4 py-2.5 hover:bg-evening hover:text-beige">
          Add a company to watch <ExternalIcon /><span className="sr-only">(opens GitHub in a new tab)</span>
        </a>
      </div>
      <p className="mt-2 text-xs text-stormy">
        The list lives in the project&apos;s <code>data/companies.json</code>. Add a line with the name, city and website, and the next morning&apos;s check includes it.
      </p>
      <ul className="mt-4 divide-y divide-line border border-line bg-paper">
        {list.map((c) => {
          const st = watchStatus(c, now);
          return (
            <li key={c.name} className="grid gap-1 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-4">
              <div className="min-w-0">
                <p className="text-lg">{c.name}{c.city && <span className="text-stormy"> · {c.city}</span>}</p>
                <p className={`text-sm ${WATCH_TONE[st.tone]}`}>{st.text}</p>
                {c.source === "careers_page" && c.possibleRoles.length > 0 && (
                  <p className="mt-1 text-sm text-stormy">Page mentions: {c.possibleRoles.slice(0, 4).join(", ")}</p>
                )}
                {c.note && c.source !== "feed" && <p className="mt-1 text-xs text-cloud">{c.note}</p>}
              </div>
              <p className="flex flex-wrap gap-x-4 text-sm sm:justify-end">
                <a href={c.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">Website <ExternalIcon className="h-3 w-3" /></a>
                {c.careersUrl && <a href={c.careersUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">Careers <ExternalIcon className="h-3 w-3" /></a>}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
