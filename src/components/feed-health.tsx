"use client";
// Shown above live openings when the daily check looks stopped or broken.
import { AlertIcon } from "@/components/icons";
import { feedProblems } from "@/lib/feed/health";
import type { CompaniesFeed, OpeningsFeed } from "@/lib/feed/schema";

export function FeedHealth({ openings, companies, now }: { openings: OpeningsFeed; companies: CompaniesFeed; now: Date }) {
  const problems = feedProblems(openings, companies, now);
  if (problems.length === 0) return null;
  return (
    <div role="status" className="mt-4 border border-danger/40 bg-paper p-4 text-sm">
      <p className="flex items-center gap-2 font-normal text-danger">
        <AlertIcon className="h-4 w-4" /> Live openings may be out of date
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-stormy">
        {problems.map((p) => <li key={p}>{p}</li>)}
      </ul>
    </div>
  );
}
