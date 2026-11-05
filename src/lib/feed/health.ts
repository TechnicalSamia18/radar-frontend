// Is the daily watcher still working? (Decision record, decision 2: results
// flow through commits, so a broken or stopped job fails silently unless the
// site says so.)
import type { CompaniesFeed, OpeningsFeed } from "./schema";

export const STALE_AFTER_HOURS = 48;

// "checked 3 hours ago": a relative time is easier to judge at a glance than
// a clock time. A timestamp in the future (clock skew) reads as "just now".
export function checkedAgo(iso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  if (minutes < 1) return "just now";
  if (minutes < 60) return plural(minutes, "minute");
  if (minutes < 24 * 60) return plural(Math.floor(minutes / 60), "hour");
  return plural(Math.floor(minutes / (24 * 60)), "day");
}

export function feedProblems(openings: OpeningsFeed, companies: CompaniesFeed, now: Date): string[] {
  const problems: string[] = [];
  const hours = (now.getTime() - new Date(openings.generatedAt).getTime()) / 3_600_000;
  if (hours > STALE_AFTER_HOURS) {
    const days = Math.floor(hours / 24);
    problems.push(
      `Live openings were last checked ${days} days ago, so the daily check may have stopped. (GitHub pauses scheduled jobs in repositories with no activity for 60 days.)`,
    );
  }
  if (companies.companies.length === 0) {
    problems.push("The last check didn't include any companies.");
  } else {
    if (!openings.complete || !companies.complete) {
      problems.push("The last check stopped before finishing, so some companies show older results.");
    }
    const failing = companies.companies.filter((c) => c.source === "unreachable").length;
    if (failing > companies.companies.length / 2) {
      problems.push(`${failing} of ${companies.companies.length} companies couldn't be reached on the last check.`);
    }
  }
  return problems;
}
