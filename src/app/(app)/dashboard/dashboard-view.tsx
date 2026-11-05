"use client";
// Dashboard (REQ-050): greeting, four numbers, best-fit openings, watched companies.
import Link from "next/link";
import { useEffect, useState } from "react";
import { DataGate } from "@/components/data-gate";
import { ClockIcon, PlusIcon } from "@/components/icons";
import { LiveSection, WatchedCompanies } from "@/components/live-section";
import { OpeningCard } from "@/components/opening-card";
import type { RadarState } from "@/lib/data/schema";
import { resetAll, update } from "@/lib/data/store";
import { dashboardStats, daysSince, lastStatusChange, markPastDeadlines, needsFollowUp, rankOpenings, setStatus } from "@/lib/openings/tracker";

export function DashboardView() {
  return (
    <div className="mx-auto max-w-5xl">
      <DataGate>{(state) => <Dashboard state={state} />}</DataGate>
    </div>
  );
}

function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Karachi" }).format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function Dashboard({ state }: { state: RadarState }) {
  // "now" is fixed for this render so every number on the page agrees.
  const [now] = useState(() => new Date());
  const [message, setMessage] = useState<string | null>(null);

  // Saved openings whose deadline has passed move to Missed (PRD §4).
  useEffect(() => {
    const next = markPastDeadlines(state, now);
    if (next !== state) update(() => next);
  }, [state, now]);

  const stats = dashboardStats(state, now);
  const ranked = rankOpenings(state, now);
  const followUps = state.openings.filter((o) => needsFollowUp(o, now));
  const empty = state.openings.length === 0 && state.companies.length === 0;

  function markApplied(id: string) {
    const r = update((s) => setStatus(s, id, "applied", new Date()));
    setMessage(r.ok ? "Marked as applied. You'll get a nudge if there's no update in 7 days." : r.message);
  }

  return (
    <>
      {state.isDemo && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-sunset/40 bg-paper px-5 py-3 text-sm">
          <p>You&apos;re looking at <strong className="font-normal text-sunset">sample data</strong> from fictional companies.</p>
          <button
            type="button"
            onClick={() => window.confirm("Remove the sample data and start with an empty Radar?") && resetAll()}
            className="label-caps underline-offset-4 hover:underline"
          >
            Exit demo
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-sunset">
            {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "Asia/Karachi" })}
          </p>
          <h1 className="mt-2 text-3xl font-normal sm:text-4xl">{greeting(now)}</h1>
          <p className="mt-2 text-stormy">
            {state.openings.length} opening{state.openings.length === 1 ? "" : "s"} · {state.companies.length} compan{state.companies.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <Link href="/openings/new" className="label-caps inline-flex items-center gap-2 bg-sunset px-6 py-3 text-sand hover:bg-sunset/85">
          <PlusIcon /> Add opening
        </Link>
      </div>

      <p aria-live="polite" className="mt-4 min-h-6 text-sm text-stormy">{message}</p>

      {!state.profile && (
        <p className="border border-line bg-paper p-4 text-stormy">
          No resume yet, so fit scores are off. <Link href="/profile" className="text-evening underline">Upload your resume</Link>
        </p>
      )}

      <LiveSection state={state} now={now} />

      {empty ? (
        <FirstRun />
      ) : (
        <>
          {/* Stat cards: your own tracker */}
          <h2 className="label-caps mt-10 text-stormy">Your applications</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="New this week" value={stats.newThisWeek} dark />
            <Stat label="Good fit" value={stats.goodFit} accent />
            <Stat label="Applied" value={stats.applied} />
            <Stat label="Follow up" value={stats.followUp} />
          </dl>


          {followUps.length > 0 && (
            <section aria-labelledby="fu-h" className="mt-10">
              <h2 id="fu-h" className="label-caps text-stormy">Time to follow up</h2>
              <ul className="mt-4 divide-y divide-line border border-line bg-paper">
                {followUps.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                    <Link href={`/openings/detail?id=${o.id}`} className="hover:underline">
                      {o.title} <span className="text-stormy">· {o.companyName}</span>
                    </Link>
                    <span className="flex items-center gap-2 text-sm text-sunset">
                      <ClockIcon /> Applied {daysSince(lastStatusChange(o), now)} days ago, no update
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="new-h" className="mt-10">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="new-h" className="label-caps text-stormy">Saved, not applied yet</h2>
              {ranked.length > 5 && <Link href="/openings" className="text-sm underline">See all {ranked.length}</Link>}
            </div>
            {ranked.length === 0 ? (
              <p className="mt-4 border border-dashed border-cloud bg-paper p-6 text-stormy">
                Nothing waiting: everything you saved is applied, missed or closed.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {ranked.slice(0, 5).map((o) => (
                  <OpeningCard key={o.id} opening={o} profile={state.profile} now={now} onMarkApplied={() => markApplied(o.id)} />
                ))}
              </div>
            )}
          </section>

          <WatchedCompanies now={now} />
        </>
      )}
    </>
  );
}

function Stat({ label, value, dark, accent }: { label: string; value: number; dark?: boolean; accent?: boolean }) {
  return (
    <div className={`p-5 ${dark ? "bg-evening text-beige" : "bg-beige"}`}>
      <dt className={`label-caps ${dark ? "text-cloud" : "text-stormy"}`}>{label}</dt>
      <dd className={`mt-2 text-4xl ${accent ? "text-sunset" : ""}`}>{value}</dd>
    </div>
  );
}

function FirstRun() {
  return (
    <section className="mt-10 border border-dashed border-cloud bg-paper p-8">
      <h2 className="text-2xl font-normal">You&apos;re not tracking anything yet</h2>
      <p className="mt-2 max-w-xl text-stormy">
        Save a live opening above, or paste one you found elsewhere. Want to see the tracker full first? Load sample data.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/openings/new" className="label-caps inline-flex items-center gap-2 bg-sunset px-6 py-3 text-sand hover:bg-sunset/85">
          <PlusIcon /> Add opening
        </Link>
        <Link href="/demo" className="label-caps border border-evening px-6 py-3 hover:bg-evening hover:text-beige">
          Load sample data
        </Link>
      </div>
    </section>
  );
}
