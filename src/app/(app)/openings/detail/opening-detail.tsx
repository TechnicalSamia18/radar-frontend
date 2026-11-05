"use client";
// Opening detail (PRD screen 3): extracted fields, fit reasons, warnings,
// apply action, status tracker with dates (REQ-061), notes (REQ-063),
// follow-up nudge (REQ-062) and the original post.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { DataGate } from "@/components/data-gate";
import { FitBadge } from "@/components/fit-badge";
import { AlertIcon, CheckIcon, ClockIcon, ExternalIcon } from "@/components/icons";
import { ApplyAction, formatDate } from "@/components/opening-card";
import type { ApplicationStatus, Opening, RadarState } from "@/lib/data/schema";
import { update } from "@/lib/data/store";
import { fitSummary, matchOpening } from "@/lib/openings/match";
import { daysSince, lastStatusChange, NEXT_STATUSES, needsFollowUp, removeOpening, setNotes, setStatus, STATUS_LABEL } from "@/lib/openings/tracker";

export function OpeningDetail() {
  const id = useSearchParams().get("id") ?? "";
  return (
    <div className="mx-auto max-w-4xl">
      <DataGate>
        {(state) => {
          const opening = state.openings.find((o) => o.id === id);
          return opening ? <Detail key={opening.id} state={state} opening={opening} /> : <NotFound />;
        }}
      </DataGate>
    </div>
  );
}

function NotFound() {
  return (
    <div className="border border-dashed border-cloud bg-paper p-8">
      <h1 className="text-2xl font-normal">Opening not found</h1>
      <p className="mt-2 text-stormy">It may have been deleted, or the link is from another browser (Radar keeps data in each browser separately).</p>
      <Link href="/openings" className="label-caps mt-6 inline-block border border-evening px-6 py-3 hover:bg-evening hover:text-beige">All openings</Link>
    </div>
  );
}

const MODE = { onsite: "Onsite", hybrid: "Hybrid", remote: "Remote" } as const;
const TYPE = { internship: "Internship", job: "Job", unclear: "Not stated" } as const;

function Detail({ state, opening: o }: { state: RadarState; opening: Opening }) {
  const router = useRouter();
  const [now] = useState(() => new Date());
  const [notes, setNotesDraft] = useState(o.notes);
  const [notice, setNotice] = useState<string | null>(null);
  const fit = matchOpening(o, state.profile, now);
  const company = state.companies.find((c) => c.id === o.companyId);
  const notesDirty = notes !== o.notes;

  function changeStatus(status: ApplicationStatus) {
    const r = update((s) => setStatus(s, o.id, status, new Date()));
    setNotice(r.ok ? `Status changed to ${STATUS_LABEL[status]}.` : r.message);
  }
  function saveNotes() {
    const r = update((s) => setNotes(s, o.id, notes));
    setNotice(r.ok ? "Notes saved." : r.message);
  }
  function remove() {
    if (!window.confirm(`Delete "${o.title}"? Its status history and notes will be lost.`)) return;
    const r = update((s) => removeOpening(s, o.id));
    if (r.ok) router.push("/openings");
    else setNotice(r.message);
  }

  const facts: Array<[string, string | null]> = [
    ["Type", TYPE[o.type]],
    ["City", o.location],
    ["Work mode", o.workMode && MODE[o.workMode]],
    ["Experience", o.experienceYears === null ? null : o.experienceYears === 0 ? "None needed" : `${o.experienceYears}+ years`],
    ["Minimum CGPA", o.minCgpa?.toFixed(2) ?? null],
    ["Graduates only", o.graduatesOnly ? "Yes" : "No"],
    ["Deadline", o.deadline ? `${formatDate(o.deadline)}${o.deadlineStatus === "check" ? " (check this date)" : ""}` : o.deadlineText ? `Check: "${o.deadlineText}"` : null],
    ["Skills asked for", o.skills.length ? o.skills.join(", ") : null],
  ];

  return (
    <>
      <Link href="/openings" className="text-sm text-stormy hover:underline">← All openings</Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label-caps text-sunset">{o.companyName}</p>
          <h1 className="mt-2 text-3xl font-normal sm:text-4xl">{o.adKind === "image" ? "New post found (image ad)" : o.title}</h1>
          <p className="mt-2 text-stormy">
            {STATUS_LABEL[o.status]} · added {formatDate(o.firstSeen.slice(0, 10))}
          </p>
        </div>
        <FitBadge fit={fit} />
      </div>

      <p aria-live="polite" className="mt-3 min-h-6 text-sm text-evening">
        {notice && <span className="inline-flex items-center gap-2"><CheckIcon className="text-sunset" />{notice}</span>}
      </p>

      {needsFollowUp(o, now) && (
        <p className="mt-2 flex items-center gap-2 border border-sunset/40 bg-paper px-4 py-3 text-sunset">
          <ClockIcon /> You applied {daysSince(lastStatusChange(o), now)} days ago with no update. Time to follow up.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* Fit */}
          <section aria-labelledby="fit-h" className="border border-line bg-paper p-6">
            <h2 id="fit-h" className="label-caps text-stormy">How you fit</h2>
            {fit.kind === "scored" ? (
              <>
                <p className="mt-3">{fitSummary(fit) || "No skills to compare."}</p>
                {fit.warnings.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 text-danger">
                    {fit.warnings.map((w) => <li key={w} className="flex items-start gap-2"><AlertIcon className="mt-1 h-4 w-4 shrink-0" />{w}</li>)}
                  </ul>
                ) : (
                  <p className="mt-3 text-stormy">No eligibility concerns found.</p>
                )}
              </>
            ) : (
              <p className="mt-3 text-stormy">{fit.reason}</p>
            )}
          </section>

          {/* Details */}
          <section aria-labelledby="det-h" className="border border-line bg-paper p-6">
            <h2 id="det-h" className="label-caps text-stormy">Details</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-sm text-stormy">{k}</dt>
                  <dd className={v ? "" : "text-cloud"}>{v ?? "Not stated"}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Notes */}
          <section aria-labelledby="notes-h" className="border border-line bg-paper p-6">
            <h2 id="notes-h" className="label-caps text-stormy"><label htmlFor="notes">Notes</label></h2>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotesDraft(e.target.value)}
              maxLength={5000}
              rows={5}
              placeholder="Contacts, interview prep, what you sent…"
              className="input mt-3"
            />
            <div className="mt-3 flex items-center gap-3">
              <button type="button" onClick={saveNotes} disabled={!notesDirty} className="label-caps bg-evening px-5 py-2.5 text-beige hover:bg-stormy disabled:opacity-50">
                Save notes
              </button>
              {notesDirty && <span className="text-sm text-stormy">Unsaved changes</span>}
            </div>
          </section>

          {/* Original post */}
          <section aria-labelledby="orig-h" className="border border-line bg-paper p-6">
            <h2 id="orig-h" className="label-caps text-stormy">Original post</h2>
            {o.sourceUrl && (
              <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 underline">
                View the original <ExternalIcon className="h-3.5 w-3.5" /><span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
            {o.rawText ? (
              // Shown as plain text: React escapes it, so any markup in the post can't run.
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words border border-line bg-sand p-4 font-sans text-sm text-stormy">{o.rawText}</pre>
            ) : (
              <p className="mt-3 text-stormy">The job ad is an image, so there&apos;s no text. Open the original to read it.</p>
            )}
          </section>
        </div>

        {/* Side: apply + tracker */}
        <aside className="h-fit space-y-6 lg:sticky lg:top-8">
          <section aria-labelledby="apply-h" className="border border-line bg-paper p-5">
            <h2 id="apply-h" className="label-caps text-stormy">Apply</h2>
            <div className="mt-3"><ApplyAction opening={o} /></div>
            <p className="mt-3 text-xs text-stormy">Radar opens the real application or your email app. You always apply yourself.</p>
            {company?.careersUrl && company.careersUrl !== o.applyUrl && (
              <a href={company.careersUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm underline">
                {company.name} careers page <ExternalIcon className="h-3 w-3" />
              </a>
            )}
          </section>

          <section aria-labelledby="track-h" className="border border-line bg-paper p-5">
            <h2 id="track-h" className="label-caps text-stormy">Track</h2>
            <p className="mt-3 text-lg">{STATUS_LABEL[o.status]}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {NEXT_STATUSES[o.status].map((s) => (
                <button key={s} type="button" onClick={() => changeStatus(s)} className="label-caps border border-evening px-4 py-2 hover:bg-evening hover:text-beige">
                  {s === "applied" ? "Mark applied" : `Mark ${STATUS_LABEL[s].toLowerCase()}`}
                </button>
              ))}
              {o.status !== "saved" && (
                <button type="button" onClick={() => changeStatus("saved")} className="px-2 py-2 text-sm text-stormy underline">
                  Back to saved
                </button>
              )}
            </div>
            <h3 className="label-caps mt-5 text-stormy">History</h3>
            <ol className="mt-2 space-y-2 border-l border-line pl-4">
              {[...o.statusHistory].reverse().map((h, i) => (
                <li key={`${h.at}-${i}`} className="text-sm">
                  <span className="text-evening">{STATUS_LABEL[h.status]}</span>{" "}
                  <time dateTime={h.at} className="text-stormy">{new Date(h.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" })}</time>
                </li>
              ))}
            </ol>
          </section>

          <button type="button" onClick={remove} className="text-sm text-danger underline">Delete this opening</button>
        </aside>
      </div>
    </>
  );
}
