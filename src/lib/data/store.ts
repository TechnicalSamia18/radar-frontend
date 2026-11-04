"use client";
// App-wide state for the browser.
//
// How it works: a tiny "external store" (a value + a list of listeners).
// React components read it through `useRadar()`, built on React's
// useSyncExternalStore, so every component re-renders when data changes —
// including when you change data in another tab (the "storage" event).
import { useSyncExternalStore } from "react";
import { createLocalRepository, STORAGE_KEY, type RadarRepository } from "./repository";
import { EMPTY_STATE, type RadarState } from "./schema";

export type StoreSnapshot =
  | { status: "loading" }
  | { status: "ready"; state: RadarState }
  | { status: "error"; reason: "corrupt" | "unavailable"; message: string };

const LOADING: StoreSnapshot = { status: "loading" };

let repo: RadarRepository | null = null;
let snapshot: StoreSnapshot = LOADING;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function init() {
  if (repo || typeof window === "undefined") return;
  repo = createLocalRepository(window.localStorage);
  refresh();
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      refresh();
      emit();
    }
  });
}

function refresh() {
  const result = repo!.load();
  snapshot = result.ok ? { status: "ready", state: result.state } : { status: "error", reason: result.reason, message: result.message };
}

function subscribe(listener: () => void) {
  init();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Read Radar's data. Shows "loading" during server rendering and the first paint. */
export function useRadar(): StoreSnapshot {
  return useSyncExternalStore(
    subscribe,
    () => (init(), snapshot),
    () => LOADING,
  );
}

export type UpdateResult = { ok: true } | { ok: false; message: string };

/**
 * Change the data with a pure function: `update(s => ({ ...s, openings: [...] }))`.
 * The new state is validated before it's saved; if saving fails nothing changes.
 */
export function update(change: (state: RadarState) => RadarState): UpdateResult {
  init();
  if (snapshot.status !== "ready" || !repo) return { ok: false, message: "Radar's data isn't loaded, so nothing was changed." };
  const next = change(snapshot.state);
  const saved = repo.save(next);
  if (!saved.ok) return saved;
  snapshot = { status: "ready", state: next };
  emit();
  return { ok: true };
}

/** Wipe everything (also the way out of a "corrupt data" error). */
export function resetAll() {
  init();
  repo?.clear();
  snapshot = { status: "ready", state: EMPTY_STATE };
  emit();
}

/** Short random id for new records. */
export function newId() {
  return crypto.randomUUID().slice(0, 12);
}
