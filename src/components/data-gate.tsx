"use client";
// Wraps every page that needs Radar's data and handles the two states every
// page shares: still loading, and "the saved data can't be read".
import type { ReactNode } from "react";
import { AlertIcon } from "@/components/icons";
import { resetAll, useRadar } from "@/lib/data/store";
import type { RadarState } from "@/lib/data/schema";

export function DataGate({ children }: { children: (state: RadarState) => ReactNode }) {
  const snap = useRadar();

  if (snap.status === "loading") {
    return (
      <div role="status" aria-label="Loading" className="mt-8 animate-pulse space-y-4">
        <div className="h-4 w-32 bg-line" />
        <div className="h-10 w-72 bg-line" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 bg-beige" />
          ))}
        </div>
      </div>
    );
  }

  if (snap.status === "error") {
    return (
      <div role="alert" className="mt-8 max-w-xl border border-danger/40 bg-paper p-6">
        <p className="flex items-center gap-2 text-lg font-normal text-danger">
          <AlertIcon className="h-5 w-5" /> {snap.message}
        </p>
        {snap.reason === "corrupt" ? (
          <>
            <p className="mt-3 text-stormy">
              This can happen if the data was edited by hand or saved by a different version of Radar. Starting fresh
              clears Radar&apos;s data in this browser only.
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Clear Radar's saved data in this browser and start fresh?")) resetAll();
              }}
              className="label-caps mt-5 bg-evening px-6 py-3 text-beige hover:bg-stormy"
            >
              Start fresh
            </button>
          </>
        ) : (
          <p className="mt-3 text-stormy">Allow site data for this page in your browser settings, then reload.</p>
        )}
      </div>
    );
  }

  return <>{children(snap.state)}</>;
}

/** Page heading used across the app: small rose label + large title + optional intro. */
export function PageHeader({ label, title, children, action }: { label: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="label-caps text-sunset">{label}</p>
        <h1 className="mt-2 text-3xl font-normal sm:text-4xl">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-stormy">{children}</div>}
      </div>
      {action}
    </div>
  );
}
