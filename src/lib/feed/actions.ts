// Saving and dismissing live openings. Pure: take state, return new state.
import type { RadarState } from "@/lib/data/schema";
import { feedItemToOpening } from "./convert";
import type { FeedItem } from "./schema";

/** Copies a live opening into your own openings (once) so you can track it. */
export function saveFeedItem(state: RadarState, item: FeedItem, newId: string, now: Date): { state: RadarState; openingId: string } {
  const existing = state.feedLinks[item.id];
  if (existing && state.openings.some((o) => o.id === existing)) return { state, openingId: existing };
  const opening = { ...feedItemToOpening(item, now), id: newId, firstSeen: now.toISOString() };
  return {
    openingId: newId,
    state: {
      ...state,
      openings: [opening, ...state.openings],
      feedLinks: { ...state.feedLinks, [item.id]: newId },
      dismissedFeedIds: state.dismissedFeedIds.filter((d) => d !== item.id),
    },
  };
}

export function dismissFeedItem(state: RadarState, id: string): RadarState {
  return state.dismissedFeedIds.includes(id) ? state : { ...state, dismissedFeedIds: [...state.dismissedFeedIds, id].slice(-5000) };
}

export function undismissFeedItem(state: RadarState, id: string): RadarState {
  return { ...state, dismissedFeedIds: state.dismissedFeedIds.filter((d) => d !== id) };
}

/** The opening you saved from this live item, if it still exists. */
export function savedOpeningId(state: RadarState, feedId: string): string | null {
  const id = state.feedLinks[feedId];
  return id && state.openings.some((o) => o.id === id) ? id : null;
}
