// The one place Radar reads and writes its data.
//
// v1 keeps everything in the browser's localStorage. The rest of the app only
// talks to the `RadarRepository` interface, so the planned backend version can
// swap in an HTTP implementation without touching any component.
import { EMPTY_STATE, radarStateSchema, type RadarState } from "./schema";

export type LoadResult =
  | { ok: true; state: RadarState }
  | { ok: false; reason: "corrupt" | "unavailable"; message: string };

export interface RadarRepository {
  load(): LoadResult;
  save(state: RadarState): { ok: true } | { ok: false; message: string };
  clear(): void;
}

export const STORAGE_KEY = "radar:v1";

/** Minimal slice of the Web Storage API, so tests can pass a fake. */
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createLocalRepository(storage: StorageLike): RadarRepository {
  return {
    load() {
      let raw: string | null;
      try {
        raw = storage.getItem(STORAGE_KEY);
      } catch {
        // Some browsers block storage (private mode, strict settings).
        return { ok: false, reason: "unavailable", message: "Your browser is blocking storage, so Radar can't keep your data." };
      }
      if (raw === null) return { ok: true, state: EMPTY_STATE };

      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        return { ok: false, reason: "corrupt", message: "Radar's saved data is damaged and can't be read." };
      }
      // Never trust stored data: it must match the schema exactly.
      const parsed = radarStateSchema.safeParse(json);
      if (!parsed.success) {
        return { ok: false, reason: "corrupt", message: "Radar's saved data doesn't look right, so it wasn't loaded." };
      }
      return { ok: true, state: parsed.data };
    },

    save(state) {
      const parsed = radarStateSchema.safeParse(state);
      if (!parsed.success) return { ok: false, message: "That change would have saved invalid data, so it was cancelled." };
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(parsed.data));
        return { ok: true };
      } catch {
        return { ok: false, message: "Your browser's storage is full or blocked, so the change wasn't saved." };
      }
    },

    clear() {
      try {
        storage.removeItem(STORAGE_KEY);
      } catch {
        /* nothing stored, nothing to clear */
      }
    },
  };
}
