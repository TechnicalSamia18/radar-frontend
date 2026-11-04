import { describe, expect, it } from "vitest";
import { profileFormToObject, profileSchema } from "./validation";

function form(entries: Array<[string, string]>) {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
}

const valid: Array<[string, string]> = [
  ["skills", "reactjs"],
  ["skills", "TypeScript"],
  ["skills", "React"], // duplicate after canonicalising
  ["semester", "5"],
  ["graduationYear", "2028"],
  ["cgpa", "3.68"],
  ["cities", "Islamabad"],
  ["cities", "Lahore"],
  ["remotePreference", "any"],
  ["seeking", "internship"],
];

describe("profileSchema", () => {
  it("accepts a normal profile and cleans up skills", () => {
    const r = profileSchema.safeParse(profileFormToObject(form(valid)));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.skills).toEqual(["React", "TypeScript"]);
    expect(r.data).toMatchObject({ semester: 5, graduationYear: 2028, cgpa: 3.68, cities: ["Islamabad", "Lahore"] });
  });

  it("treats blank optional numbers as not given", () => {
    const entries = valid.filter(([k]) => k !== "cgpa").concat([["cgpa", ""]]);
    const r = profileSchema.safeParse(profileFormToObject(form(entries)));
    expect(r.success && r.data.cgpa).toBe(null);
  });

  it("rejects a CGPA above 4 instead of capping it", () => {
    const entries = valid.filter(([k]) => k !== "cgpa").concat([["cgpa", "4.5"]]);
    expect(profileSchema.safeParse(profileFormToObject(form(entries))).success).toBe(false);
  });

  it("rejects non-numbers in number fields", () => {
    const entries = valid.filter(([k]) => k !== "semester").concat([["semester", "five"]]);
    expect(profileSchema.safeParse(profileFormToObject(form(entries))).success).toBe(false);
  });

  it("rejects a city that isn't on the list", () => {
    const entries = valid.concat([["cities", "Atlantis"]]);
    expect(profileSchema.safeParse(profileFormToObject(form(entries))).success).toBe(false);
  });

  it("rejects an unknown enum value", () => {
    const entries = valid.filter(([k]) => k !== "seeking").concat([["seeking", "ceo"]]);
    expect(profileSchema.safeParse(profileFormToObject(form(entries))).success).toBe(false);
  });

  it("rejects hostile skill text (markup, quotes, very long)", () => {
    for (const bad of ['<img src=x onerror=alert(1)>', "'; DROP TABLE profile; --", "x".repeat(41)]) {
      const entries = valid.concat([["skills", bad]]);
      expect(profileSchema.safeParse(profileFormToObject(form(entries))).success, bad).toBe(false);
    }
  });

  it("rejects more than 60 skills", () => {
    const many = Array.from({ length: 61 }, (_, i) => ["skills", `Skill ${i}`] as [string, string]);
    expect(profileSchema.safeParse(profileFormToObject(form([...valid, ...many]))).success).toBe(false);
  });

  it("ignores fields it doesn't expect (e.g. someone adding id=2)", () => {
    const r = profileSchema.safeParse(profileFormToObject(form([...valid, ["id", "2"], ["isAdmin", "true"]])));
    expect(r.success).toBe(true);
    expect(r.success && "id" in r.data).toBe(false);
  });

  it("rejects extra keys if they are passed directly", () => {
    const obj = { ...profileFormToObject(form(valid)), id: 2 };
    expect(profileSchema.safeParse(obj).success).toBe(false);
  });
});
