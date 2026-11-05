"use client";
// Loads the watcher's files (/feed/openings.json and /feed/companies.json)
// once per page load and shares them between components.
import { useEffect, useState } from "react";
import { companiesFeedSchema, openingsFeedSchema, type CompaniesFeed, type OpeningsFeed } from "./schema";

export type FeedState =
  | { status: "loading" }
  | { status: "ready"; openings: OpeningsFeed; companies: CompaniesFeed }
  | { status: "error"; message: string };

let cache: Promise<FeedState> | null = null;

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function load(): Promise<FeedState> {
  try {
    const [o, c] = await Promise.all([fetchJson("/feed/openings.json"), fetchJson("/feed/companies.json")]);
    if (!o || !c) return { status: "error", message: "The daily watcher hasn't published any results yet." };
    const openings = openingsFeedSchema.safeParse(o);
    const companies = companiesFeedSchema.safeParse(c);
    if (!openings.success || !companies.success) return { status: "error", message: "The live data didn't look right, so it wasn't shown." };
    return { status: "ready", openings: openings.data, companies: companies.data };
  } catch {
    return { status: "error", message: "Couldn't load live openings. Check your connection and try again." };
  }
}

export function useFeed(): FeedState & { retry: () => void } {
  const [state, setState] = useState<FeedState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    cache ??= load();
    cache.then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, [attempt]);
  return {
    ...state,
    retry: () => {
      cache = null;
      setState({ status: "loading" });
      setAttempt((a) => a + 1);
    },
  };
}
