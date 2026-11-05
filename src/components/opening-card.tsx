"use client";
// One opening, as on the dashboard mockup: title, company · city · mode · type,
// fit badge, what fits / what's missing, warnings, deadline, and actions.
// All text from a pasted post is rendered as plain text (React escapes it).
import Link from "next/link";
import { FitBadge } from "@/components/fit-badge";
import { AlertIcon, ClockIcon, ExternalIcon, ImageIcon, MailIcon } from "@/components/icons";
import type { Opening, Profile } from "@/lib/data/schema";
import { fitSummary, matchOpening } from "@/lib/openings/match";

const TYPE_LABEL = { internship: "Internship", job: "Job", unclear: "Type not stated" } as const;
const MODE_LABEL = { onsite: "Onsite", hybrid: "Hybrid", remote: "Remote" } as const;

export function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** The "how to apply" action (REQ-060). Opens the real link or your email app; never submits anything. */
export function ApplyAction({ opening, compact = false }: { opening: Opening; compact?: boolean }) {
  const cls = `label-caps inline-flex items-center gap-2 bg-evening text-beige hover:bg-stormy ${compact ? "px-4 py-2.5" : "px-6 py-3"}`;
  if (opening.applyUrl) {
    return (
      <a href={opening.applyUrl} target="_blank" rel="noopener noreferrer" className={cls}>
        Open application <ExternalIcon />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }
  if (opening.applyEmail) {
    const subject = encodeURIComponent(`Application: ${opening.title}`);
    return (
      <a href={`mailto:${opening.applyEmail}?subject=${subject}`} className={cls}>
        <MailIcon /> Apply by email
      </a>
    );
  }
  if (opening.sourceUrl) {
    return (
      <a href={opening.sourceUrl} target="_blank" rel="noopener noreferrer" className={cls}>
        View original <ExternalIcon />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }
  return <span className="text-sm text-stormy">No apply link or email in the post</span>;
}

export function OpeningCard({ opening, profile, now, onMarkApplied }: { opening: Opening; profile: Profile | null; now: Date; onMarkApplied?: () => void }) {
  const fit = matchOpening(opening, profile, now);
  const isImage = opening.adKind === "image";
  const meta = [opening.companyName, opening.location, opening.workMode && MODE_LABEL[opening.workMode], TYPE_LABEL[opening.type]].filter(Boolean);
  const warnings = fit.kind === "scored" ? fit.warnings : [];

  return (
    <article
      className={`relative bg-paper p-5 sm:p-6 ${isImage ? "border border-dashed border-cloud" : `border border-line border-l-2 ${fit.kind === "scored" && fit.level === "good" ? "border-l-sunset" : "border-l-cloud"}`}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xl font-normal">
            <Link href={`/openings/detail?id=${opening.id}`} className="hover:underline">
              {isImage ? (
                <span className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-stormy" /> New post found</span>
              ) : (
                opening.title
              )}
            </Link>
          </h3>
          <p className="mt-1 text-stormy">
            {isImage ? `${opening.companyName} · job ad is an image, open to view` : meta.join(" · ")}
          </p>
        </div>
        <FitBadge fit={fit} />
      </div>

      {fit.kind === "scored" && <p className="mt-3 text-sm">{fitSummary(fit)}</p>}

      {(warnings.length > 0 || opening.deadline) && (
        <ul className="mt-3 space-y-1 text-sm">
          {opening.deadline && opening.deadlineStatus !== "check" && opening.deadlineStatus !== "past" && (
            <li className="flex items-center gap-2 text-stormy"><ClockIcon /> Apply by {formatDate(opening.deadline)}</li>
          )}
          {warnings.slice(0, 2).map((w) => (
            <li key={w} className="flex items-start gap-2 text-danger"><AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />{w}</li>
          ))}
          {warnings.length > 2 && (
            <li className="text-stormy">
              <Link href={`/openings/detail?id=${opening.id}`} className="underline">+{warnings.length - 2} more</Link>
            </li>
          )}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ApplyAction opening={opening} compact />
        {onMarkApplied && opening.status === "saved" && (
          <button type="button" onClick={onMarkApplied} className="label-caps border border-evening px-4 py-2.5 hover:bg-evening hover:text-beige">
            Mark applied
          </button>
        )}
      </div>
    </article>
  );
}
