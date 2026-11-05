"use client";
// "Try the demo": loads fictional sample data and opens the dashboard.
// If you already have your own data, it asks first instead of overwriting it.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RadarMark } from "@/components/icons";
import { buildDemoState } from "@/lib/data/demo";
import { update, useRadar } from "@/lib/data/store";

export function DemoLoader() {
  const snap = useRadar();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const hasOwnData =
    snap.status === "ready" && !snap.state.isDemo && (snap.state.openings.length > 0 || snap.state.companies.length > 0 || snap.state.profile !== null);

  function load() {
    const r = update(() => buildDemoState(new Date()));
    if (r.ok) router.replace("/dashboard");
    else setError(r.message);
  }

  // Nothing to lose: load straight away.
  useEffect(() => {
    if (snap.status === "ready" && !hasOwnData) {
      const r = update(() => buildDemoState(new Date()));
      if (r.ok) router.replace("/dashboard");
    }
  }, [snap.status, hasOwnData, router]);

  return (
    <main className="flex flex-1 items-center justify-center bg-evening px-6 py-20 text-beige">
      <div className="max-w-md text-center">
        <RadarMark className="mx-auto h-10 w-10 text-rose" />
        {snap.status === "error" ? (
          <>
            <h1 className="mt-6 text-3xl font-normal">Can&apos;t load the demo</h1>
            <p className="mt-4 text-beige/80">{snap.message}</p>
          </>
        ) : hasOwnData ? (
          <>
            <h1 className="mt-6 text-3xl font-normal">Replace your data with the demo?</h1>
            <p className="mt-4 text-beige/80">
              Radar keeps one set of data in this browser. Loading the demo replaces your profile, companies and
              openings. Export your openings first if you want a copy.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={load} className="label-caps bg-sunset px-6 py-3 text-sand hover:bg-sunset/85">
                Load the demo
              </button>
              <Link href="/dashboard" className="label-caps border border-beige/70 px-6 py-3 hover:bg-beige hover:text-evening">
                Keep my data
              </Link>
            </div>
          </>
        ) : (
          <p role="status" className="mt-6 text-beige/80">Loading sample data…</p>
        )}
        {error && <p role="alert" className="mt-4 text-rose">{error}</p>}
      </div>
    </main>
  );
}
