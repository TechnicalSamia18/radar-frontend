"use client";
// A live opening found by the daily watcher: fit, reasons, warnings, and
// actions to open the real posting, save it to your openings, or hide it.
import Link from "next/link";
import { FitBadge } from "@/components/fit-badge";
import { AlertIcon, CheckIcon, ExternalIcon } from "@/components/icons";
import type { Opening } from "@/lib/data/schema";
import type { FeedItem } from "@/lib/feed/schema";
import { fitSummary, type Fit } from "@/lib/openings/match";

const MODE = { onsite: "Onsite", hybrid: "Hybrid", remote: "Remote" } as const;

export function LiveCard({
  item,
  opening,
  fit,
  fresh,
  savedId,
  onSave,
  onDismiss,
}: {
  item: FeedItem;
  opening: Opening;
  fit: Fit;
  fresh: boolean;
  savedId: string | null;
  onSave: () => void;
  onDismiss: () => void;
}) {
  const meta = [item.companyName, opening.location ?? item.location, opening.workMode && MODE[opening.workMode], opening.type === "internship" ? "Internship" : "Job"].filter(Boolean);
  const warnings = fit.kind === "scored" ? fit.warnings : [];
  return (
    <article className={`border border-line border-l-2 bg-paper p-5 sm:p-6 ${fit.kind === "scored" && fit.level === "good" ? "border-l-sunset" : "border-l-cloud"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xl font-normal">
            {item.title}
            {fresh && <span className="label-caps ml-3 align-middle text-xs text-sunset">New</span>}
          </h3>
          <p className="mt-1 text-stormy">{meta.join(" · ")}</p>
        </div>
        <FitBadge fit={fit} />
      </div>

      {fit.kind === "scored" ? (
        fitSummary(fit) && <p className="mt-3 text-sm">{fitSummary(fit)}</p>
      ) : (
        <p className="mt-3 text-sm text-stormy">{fit.reason}</p>
      )}
      {warnings.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-danger">
          {warnings.slice(0, 2).map((w) => (
            <li key={w} className="flex items-start gap-2"><AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />{w}</li>
          ))}
          {warnings.length > 2 && <li className="text-stormy">+{warnings.length - 2} more</li>}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="label-caps inline-flex items-center gap-2 bg-evening px-4 py-2.5 text-beige hover:bg-stormy">
          Open posting <ExternalIcon /><span className="sr-only">(opens {item.source} in a new tab)</span>
        </a>
        {savedId ? (
          <Link href={`/openings/detail?id=${savedId}`} className="label-caps inline-flex items-center gap-2 border border-sunset px-4 py-2.5 text-sunset hover:bg-sunset hover:text-sand">
            <CheckIcon /> Saved · track it
          </Link>
        ) : (
          <button type="button" onClick={onSave} className="label-caps border border-evening px-4 py-2.5 hover:bg-evening hover:text-beige">
            Save to my openings
          </button>
        )}
        {!savedId && (
          <button type="button" onClick={onDismiss} className="px-2 py-2.5 text-sm text-stormy underline-offset-4 hover:underline">
            Not interested
          </button>
        )}
        <span className="ml-auto text-xs text-cloud">via {item.source}</span>
      </div>
    </article>
  );
}
