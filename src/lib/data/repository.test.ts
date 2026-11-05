import { describe, expect, it } from "vitest";
import { createLocalRepository, STORAGE_KEY } from "./repository";
import { EMPTY_STATE, type RadarState } from "./schema";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const profileState: RadarState = {
  ...EMPTY_STATE,
  profile: {
    skills: ["React"],
    semester: 5,
    graduationYear: 2028,
    cgpa: 3.68,
    cities: ["Islamabad"],
    remotePreference: "any",
    seeking: "internship",
    resumeFileName: null,
    updatedAt: "2026-11-04T10:00:00.000Z",
  },
};

describe("local repository", () => {
  it("starts empty when nothing is stored", () => {
    expect(createLocalRepository(fakeStorage()).load()).toEqual({ ok: true, state: EMPTY_STATE });
  });

  it("saves and loads the same state", () => {
    const storage = fakeStorage();
    const repo = createLocalRepository(storage);
    expect(repo.save(profileState)).toEqual({ ok: true });
    expect(repo.load()).toEqual({ ok: true, state: profileState });
  });

  it("loads data saved before live openings existed (missing new fields get defaults)", () => {
    const old = { version: 1, profile: null, companies: [], openings: [], isDemo: false };
    const r = createLocalRepository(fakeStorage({ [STORAGE_KEY]: JSON.stringify(old) })).load();
    expect(r).toEqual({ ok: true, state: EMPTY_STATE });
  });

  it("reports damaged JSON instead of crashing", () => {
    const repo = createLocalRepository(fakeStorage({ [STORAGE_KEY]: "{not json" }));
    expect(repo.load()).toMatchObject({ ok: false, reason: "corrupt" });
  });

  it("rejects stored data that doesn't match the schema (e.g. edited by hand)", () => {
    const tampered = JSON.stringify({ ...EMPTY_STATE, openings: [{ id: "x", title: "<script>" }] });
    expect(createLocalRepository(fakeStorage({ [STORAGE_KEY]: tampered })).load()).toMatchObject({ ok: false, reason: "corrupt" });
  });

  it("rejects stored openings with javascript: or data: links", () => {
    const opening = { id: "o1", companyId: null, companyName: "X", title: "Dev", type: "job", location: null, workMode: null, skills: [], experienceYears: null, graduatesOnly: false, minCgpa: null, deadline: null, deadlineText: null, deadlineStatus: "none", applyUrl: "javascript:alert(1)", applyEmail: null, sourceUrl: null, adKind: "text", rawText: "", firstSeen: "2026-11-05T10:00:00.000Z", status: "saved", statusHistory: [], notes: "" };
    const stored = JSON.stringify({ ...EMPTY_STATE, openings: [opening] });
    expect(createLocalRepository(fakeStorage({ [STORAGE_KEY]: stored })).load()).toMatchObject({ ok: false, reason: "corrupt" });
    const fixed = JSON.stringify({ ...EMPTY_STATE, openings: [{ ...opening, applyUrl: "https://ok.example.com" }] });
    expect(createLocalRepository(fakeStorage({ [STORAGE_KEY]: fixed })).load().ok).toBe(true);
  });

  it("refuses to save invalid data", () => {
    const repo = createLocalRepository(fakeStorage());
    const bad = { ...profileState, profile: { ...profileState.profile!, cgpa: 9 } };
    expect(repo.save(bad).ok).toBe(false);
  });

  it("reports blocked storage", () => {
    const blocked = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => {}, removeItem: () => {} };
    expect(createLocalRepository(blocked).load()).toMatchObject({ ok: false, reason: "unavailable" });
  });

  it("reports a full storage quota on save", () => {
    const full = { ...fakeStorage(), setItem: () => { throw new Error("QuotaExceededError"); } };
    expect(createLocalRepository(full).save(profileState).ok).toBe(false);
  });

  it("clear removes the saved data", () => {
    const storage = fakeStorage();
    const repo = createLocalRepository(storage);
    repo.save(profileState);
    repo.clear();
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
  });
});
