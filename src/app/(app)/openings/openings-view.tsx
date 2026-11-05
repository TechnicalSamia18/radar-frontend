"use client";
// Openings "workbook" (PRD screen 2): every opening, combined filters that
// apply as you change them (REQ-051), sorting, and CSV export (REQ-052).
import Link from "next/link";
import { useState } from "react";
import { DataGate, PageHeader } from "@/components/data-gate";
import { FitBadge } from "@/components/fit-badge";
import { AlertIcon, DownloadIcon, PlusIcon } from "@/components/icons";
import { formatDate } from "@/components/opening-card";
import type { RadarState } from "@/lib/data/schema";
import { downloadText, openingsCsv } from "@/lib/openings/export";
import { activeFilterCount, filterOpenings, NO_FILTERS, type Filters, type SortKey } from "@/lib/openings/filter";
import { needsFollowUp, STATUS_LABEL } from "@/lib/openings/tracker";
import { CITIES } from "@/lib/profile/options";

export function OpeningsView() {
  return (
    <div className="mx-auto max-w-6xl">
      <DataGate>{(state) => <Openings state={state} />}</DataGate>
    </div>
  );
}

function Openings({ state }: { state: RadarState }) {
  const [now] = useState(() => new Date());
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<SortKey>("fit");
  const [filtersOpen, setFiltersOpen] = useState(false); // phones only; always shown on desktop
  const rows = filterOpenings(state.openings, state.profile, f, sort, now);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((p) => ({ ...p, [k]: v }));
  const filtered = activeFilterCount(f) > 0;

  return (
    <>
      <PageHeader
        label="My openings"
        title="Openings you're tracking"
        action={
          <div className="flex flex-wrap gap-3">
            <Link href="/openings/new" className="label-caps inline-flex items-center gap-2 bg-sunset px-5 py-3 text-sand hover:bg-sunset/85">
              <PlusIcon /> Add opening
            </Link>
            <button
              type="button"
              disabled={state.openings.length === 0}
              onClick={() => downloadText(openingsCsv(state, now), `radar-openings-${now.toISOString().slice(0, 10)}.csv`)}
              className="label-caps inline-flex items-center gap-2 border border-evening px-5 py-3 hover:bg-evening hover:text-beige disabled:opacity-50"
            >
              <DownloadIcon /> Export CSV
            </button>
          </div>
        }
      />

      {state.openings.length === 0 ? (
        <div className="mt-8 border border-dashed border-cloud bg-paper p-8">
          <h2 className="text-2xl font-normal">No openings yet</h2>
          <p className="mt-2 text-stormy">
            Save one from <Link href="/live" className="text-evening underline">Live openings</Link>, or paste a job post you&apos;ve found
            elsewhere and Radar will read it for you.
          </p>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <form role="search" aria-label="Filter openings" onSubmit={(e) => e.preventDefault()} className="mt-8 grid gap-3 border border-line bg-paper p-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterControl label="Search">
              {(id) => <input id={id} type="search" value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Title or company" className="input" />}
            </FilterControl>
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="more-filters"
              onClick={() => setFiltersOpen((o) => !o)}
              className="label-caps border border-evening px-4 py-3 lg:hidden"
            >
              {filtersOpen ? "Hide filters" : `Filters${activeFilterCount(f) - (f.q ? 1 : 0) > 0 ? ` (${activeFilterCount(f) - (f.q ? 1 : 0)})` : ""}`}
            </button>
            {/* On phones these collapse behind the button; on desktop "lg:contents" lays them out in the same grid. */}
            <div id="more-filters" className={`${filtersOpen ? "grid" : "hidden"} gap-3 sm:col-span-2 sm:grid-cols-2 lg:contents`}>
            <FilterControl label="City">
              {(id) => (
                <select id={id} value={f.city} onChange={(e) => set("city", e.target.value)} className="input">
                  <option value="">Any city</option>
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              )}
            </FilterControl>
            <FilterControl label="Work mode">
              {(id) => (
                <select id={id} value={f.workMode} onChange={(e) => set("workMode", e.target.value as Filters["workMode"])} className="input">
                  <option value="">Any</option>
                  <option value="onsite">Onsite</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="remote">Remote</option>
                </select>
              )}
            </FilterControl>
            <FilterControl label="Type">
              {(id) => (
                <select id={id} value={f.type} onChange={(e) => set("type", e.target.value as Filters["type"])} className="input">
                  <option value="">Internships and jobs</option>
                  <option value="internship">Internships</option>
                  <option value="job">Jobs</option>
                </select>
              )}
            </FilterControl>
            <FilterControl label="Fit">
              {(id) => (
                <select id={id} value={f.fit} onChange={(e) => set("fit", e.target.value as Filters["fit"])} className="input">
                  <option value="">Any fit</option>
                  <option value="good">Good (70%+)</option>
                  <option value="fair">Fair (45–69%)</option>
                  <option value="low">Low (under 45%)</option>
                  <option value="unknown">Fit unknown</option>
                </select>
              )}
            </FilterControl>
            <FilterControl label="Status">
              {(id) => (
                <select id={id} value={f.status} onChange={(e) => set("status", e.target.value as Filters["status"])} className="input">
                  <option value="active">Active</option>
                  <option value="">All</option>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )}
            </FilterControl>
            <FilterControl label="Sort by">
              {(id) => (
                <select id={id} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input">
                  <option value="fit">Best fit</option>
                  <option value="deadline">Deadline (soonest)</option>
                  <option value="newest">Newest</option>
                </select>
              )}
            </FilterControl>
            <label className="flex items-center gap-3 self-end pb-2">
              <input type="checkbox" checked={f.newOnly} onChange={(e) => set("newOnly", e.target.checked)} className="accent-sunset" />
              New this week only
            </label>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-stormy" aria-live="polite">
            <p>
              Showing {rows.length} of {state.openings.length} opening{state.openings.length === 1 ? "" : "s"}
            </p>
            {filtered && <button type="button" onClick={() => setF(NO_FILTERS)} className="underline">Clear filters</button>}
          </div>

          {rows.length === 0 ? (
            <div className="mt-4 border border-dashed border-cloud bg-paper p-8 text-center">
              <p className="text-lg">No openings match these filters.</p>
              <button type="button" onClick={() => setF(NO_FILTERS)} className="label-caps mt-4 border border-evening px-6 py-3 hover:bg-evening hover:text-beige">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="mt-4 border border-line bg-paper">
              {/* Column headings: desktop only. On phones each row becomes a card. */}
              <div aria-hidden="true" className="label-caps hidden grid-cols-[1fr_10rem_7rem_8rem_7rem] gap-4 border-b border-line px-5 py-3 text-stormy lg:grid">
                <span>Opening</span><span>Fit</span><span>City</span><span>Deadline</span><span>Status</span>
              </div>
              <ul className="divide-y divide-line">
                {rows.map(({ opening: o, fit }) => (
                  <li key={o.id} className="grid gap-2 px-5 py-4 lg:grid-cols-[1fr_10rem_7rem_8rem_7rem] lg:items-center lg:gap-4">
                    <div className="min-w-0">
                      <Link href={`/openings/detail?id=${o.id}`} className="text-lg hover:underline">
                        {o.adKind === "image" ? "New post found (image ad)" : o.title}
                      </Link>
                      <p className="text-sm text-stormy">
                        {o.companyName} · {o.type === "unclear" ? "Type not stated" : o.type === "internship" ? "Internship" : "Job"}
                        {o.workMode && ` · ${o.workMode[0].toUpperCase()}${o.workMode.slice(1)}`}
                      </p>
                      {fit.kind === "scored" && fit.warnings.length > 0 && (
                        <p className="mt-1 flex items-start gap-1.5 text-sm text-danger"><AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />{fit.warnings[0]}{fit.warnings.length > 1 && ` (+${fit.warnings.length - 1})`}</p>
                      )}
                    </div>
                    <div><FitBadge fit={fit} /></div>
                    <p className="text-sm lg:text-base"><span className="text-stormy lg:hidden">City: </span>{o.location ?? <span className="text-cloud">Not stated</span>}</p>
                    <p className="text-sm lg:text-base">
                      <span className="text-stormy lg:hidden">Deadline: </span>
                      {o.deadline ? (
                        <span className={o.deadlineStatus === "check" ? "text-danger" : o.deadlineStatus === "past" ? "text-cloud line-through" : ""}>
                          {formatDate(o.deadline)}{o.deadlineStatus === "check" && " (check)"}
                        </span>
                      ) : (
                        <span className="text-cloud">{o.deadlineText ? "Check date" : "Not stated"}</span>
                      )}
                    </p>
                    <p className="text-sm lg:text-base">
                      <span className="text-stormy lg:hidden">Status: </span>
                      {STATUS_LABEL[o.status]}
                      {needsFollowUp(o, now) && <span className="block text-xs text-sunset">Follow up</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </>
  );
}

function FilterControl({ label, children }: { label: string; children: (id: string) => React.ReactNode }) {
  const id = `f-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="label-caps text-stormy">{label}</label>
      <div className="mt-1">{children(id)}</div>
    </div>
  );
}
