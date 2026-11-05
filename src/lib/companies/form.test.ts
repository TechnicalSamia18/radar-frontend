import { describe, expect, it } from "vitest";
import { buildDemoState } from "@/lib/data/demo";
import { radarStateSchema } from "@/lib/data/schema";
import { addCompany, companyFormSchema, findDuplicate, removeCompany, updateCompany } from "./form";

const NOW = new Date("2026-11-05T09:00:00+05:00");
const demo = buildDemoState(NOW);
const base = { name: "Acme Soft", city: "Lahore", website: "https://acme.example.com", careersUrl: "", hiringEmail: "", careersStatus: "not_checked" };

describe("company form", () => {
  it("validates the website and email (REQ-002)", () => {
    expect(companyFormSchema.safeParse(base).success).toBe(true);
    expect(companyFormSchema.safeParse({ ...base, website: "acme.example.com" }).success).toBe(false);
    expect(companyFormSchema.safeParse({ ...base, website: "javascript:alert(1)" }).success).toBe(false);
    expect(companyFormSchema.safeParse({ ...base, hiringEmail: "nope" }).success).toBe(false);
  });

  it("rejects a duplicate name or website, with a message", () => {
    const f = companyFormSchema.parse({ ...base, name: "nimbus labs" });
    expect(findDuplicate(demo, f)).toEqual({ field: "name", message: "Nimbus Labs is already in your list." });
    const g = companyFormSchema.parse({ ...base, website: "https://www.nimbus.example.com/about" });
    expect(findDuplicate(demo, g)?.field).toBe("website");
    expect(findDuplicate(demo, companyFormSchema.parse(base))).toBeNull();
  });

  it("doesn't count the company being edited as its own duplicate", () => {
    const f = companyFormSchema.parse({ ...base, name: "Nimbus Labs", website: "https://nimbus.example.com" });
    expect(findDuplicate(demo, f, "nimbus")).toBeNull();
  });

  it("adds, edits (your careers link wins) and removes, keeping state valid", () => {
    let s = addCompany(demo, companyFormSchema.parse(base), "acme", NOW);
    expect(s.companies).toHaveLength(9);
    s = updateCompany(s, "nimbus", companyFormSchema.parse({ ...base, name: "Nimbus Labs Pvt", website: "https://nimbus.example.com", careersUrl: "https://nimbus.example.com/jobs", careersStatus: "careers_page" }));
    expect(s.companies.find((c) => c.id === "nimbus")?.careersUrl).toBe("https://nimbus.example.com/jobs");
    expect(s.openings.filter((o) => o.companyId === "nimbus").every((o) => o.companyName === "Nimbus Labs Pvt")).toBe(true);
    s = removeCompany(s, "nimbus");
    expect(s.companies.some((c) => c.id === "nimbus")).toBe(false);
    expect(s.openings.filter((o) => o.companyName === "Nimbus Labs Pvt").every((o) => o.companyId === null)).toBe(true);
    expect(radarStateSchema.safeParse(s).success).toBe(true);
  });
});
