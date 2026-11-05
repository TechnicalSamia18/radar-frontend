// Application tracking (REQ-060–063) and the numbers on the dashboard.
// Pure functions: they take the state and return new state or derived values.
import type { ApplicationStatus, Opening, RadarState } from "@/lib/data/schema";
import { todayPk } from "./extract";
import { matchOpening } from "./match";

export const FOLLOW_UP_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  missed: "Missed",
};

/** Where an opening can go next. Any status can also go back to Saved (to undo a mistake). */
export const NEXT_STATUSES: Record<ApplicationStatus, ApplicationStatus[]> = {
  saved: ["applied", "missed"],
  applied: ["interview", "rejected"],
  interview: ["offer", "rejected"],
  offer: [],
  rejected: [],
  missed: ["applied"],
};

/** When the opening last changed status. */
export function lastStatusChange(o: Opening): Date {
  const last = o.statusHistory[o.statusHistory.length - 1];
  return new Date(last?.at ?? o.firstSeen);
}

/** Records a status change with its date (REQ-061). No-op if the status is the same. */
export function setStatus(state: RadarState, id: string, status: ApplicationStatus, now: Date): RadarState {
  return {
    ...state,
    openings: state.openings.map((o) =>
      o.id !== id || o.status === status
        ? o
        : { ...o, status, statusHistory: [...o.statusHistory, { status, at: now.toISOString() }].slice(-50) },
    ),
  };
}

export function setNotes(state: RadarState, id: string, notes: string): RadarState {
  return { ...state, openings: state.openings.map((o) => (o.id === id ? { ...o, notes: notes.slice(0, 5000) } : o)) };
}

export function removeOpening(state: RadarState, id: string): RadarState {
  return { ...state, openings: state.openings.filter((o) => o.id !== id) };
}

/** Applied 7+ days ago with no update since (REQ-062). */
export function needsFollowUp(o: Opening, now: Date): boolean {
  return o.status === "applied" && now.getTime() - lastStatusChange(o).getTime() >= FOLLOW_UP_DAYS * DAY;
}

export function daysSince(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / DAY);
}

export function isNewThisWeek(o: Opening, now: Date): boolean {
  return now.getTime() - new Date(o.firstSeen).getTime() < 7 * DAY;
}

/**
 * Saved openings whose deadline has now passed move to Missed (PRD §4).
 * Run when the dashboard loads; returns the same object if nothing changed.
 */
export function markPastDeadlines(state: RadarState, now: Date): RadarState {
  const today = todayPk(now);
  let changed = false;
  const openings = state.openings.map((o) => {
    if (o.status === "saved" && o.deadline && o.deadline < today && o.deadlineStatus !== "check") {
      changed = true;
      return {
        ...o,
        deadlineStatus: "past" as const,
        status: "missed" as const,
        statusHistory: [...o.statusHistory, { status: "missed" as const, at: now.toISOString() }].slice(-50),
      };
    }
    return o;
  });
  return changed ? { ...state, openings } : state;
}

export type DashboardStats = { newThisWeek: number; goodFit: number; applied: number; followUp: number };

export function dashboardStats(state: RadarState, now: Date): DashboardStats {
  const open = state.openings.filter((o) => o.status !== "missed" && o.status !== "rejected");
  return {
    newThisWeek: state.openings.filter((o) => isNewThisWeek(o, now)).length,
    goodFit: open.filter((o) => {
      const fit = matchOpening(o, state.profile, now);
      return fit.kind === "scored" && fit.level === "good";
    }).length,
    applied: state.openings.filter((o) => ["applied", "interview", "offer"].includes(o.status)).length,
    followUp: state.openings.filter((o) => needsFollowUp(o, now)).length,
  };
}

/** Openings still worth acting on, best fit first; unknown fit after scored ones, newest first among equals. */
export function rankOpenings(state: RadarState, now: Date): Opening[] {
  const score = (o: Opening) => {
    const fit = matchOpening(o, state.profile, now);
    return fit.kind === "scored" ? fit.score : -1;
  };
  return state.openings
    .filter((o) => o.status === "saved")
    .map((o) => ({ o, s: score(o) }))
    .sort((a, b) => b.s - a.s || b.o.firstSeen.localeCompare(a.o.firstSeen))
    .map((x) => x.o);
}
