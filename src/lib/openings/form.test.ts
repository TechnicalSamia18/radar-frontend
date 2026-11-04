import { describe, expect, it } from "vitest";
import { EMPTY_STATE, radarStateSchema } from "@/lib/data/schema";
import { addOpening, openingFormSchema, openingFormToObject } from "./form";

const NOW = new Date("2026-11-04T12:00:00+05:00");
const IDS = { opening: "op1", company: "co1" };

function form(fields: Record<string, string | string[]>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) f.append(k, x);
  return f;
}

const valid = {
  companyName: "Nimbus Labs",
  title: "Frontend Intern",
  type: "internship",
  location: "Lahore",
  workMode: "hybrid",
  skills: ["reactjs", "Git", "React"],
  experienceYears: "",
  minCgpa: "3",
  deadline: "2026-11-20",
  deadlineText: "20th Nov",
  deadlineChecked: "on",
  applyEmail: "careers@nimbuslabs.pk",
  applyUrl: "",
  sourceUrl: "https://nimbuslabs.pk/careers",
  adKind: "text",
  rawText: "Frontend Intern at Nimbus Labs...",
};

function parse(fields: Record<string, string | string[]>) {
  return openingFormSchema.safeParse(openingFormToObject(form(fields)));
}

describe("openingFormSchema", () => {
  it("accepts a complete form and turns blanks into 'not stated'", () => {
    const r = parse(valid);
    expect(r.success).toBe(true);
    expect(r.success && r.data).toMatchObject({ experienceYears: null, applyUrl: null, minCgpa: 3, deadlineChecked: true });
  });

  it("requires a company and a title", () => {
    const r = parse({ ...valid, companyName: " ", title: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(["companyName", "title"]));
  });

  it("rejects javascript: and data: links", () => {
    expect(parse({ ...valid, applyUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(parse({ ...valid, sourceUrl: "data:text/html,hi" }).success).toBe(false);
  });

  it("rejects a bad email, an impossible date and CGPA above 4", () => {
    expect(parse({ ...valid, applyEmail: "hr@@x" }).success).toBe(false);
    expect(parse({ ...valid, deadline: "2026-02-31" }).success).toBe(false);
    expect(parse({ ...valid, minCgpa: "4.5" }).success).toBe(false);
  });

  it("needs a link for image job ads and pasted text otherwise", () => {
    expect(parse({ ...valid, adKind: "image", sourceUrl: "", rawText: "" }).success).toBe(false);
    expect(parse({ ...valid, adKind: "image", rawText: "" }).success).toBe(true);
    expect(parse({ ...valid, rawText: "  " }).success).toBe(false);
  });

  it("rejects markup in skill names", () => {
    expect(parse({ ...valid, skills: ["<script>"] }).success).toBe(false);
  });
});

describe("addOpening", () => {
  const f = openingFormSchema.parse(openingFormToObject(form(valid)));

  it("adds the opening and a new company, producing valid stored state", () => {
    const { state, opening } = addOpening(EMPTY_STATE, f, IDS, NOW);
    expect(radarStateSchema.safeParse(state).success).toBe(true);
    expect(state.companies).toHaveLength(1);
    expect(state.companies[0]).toMatchObject({ name: "Nimbus Labs", careersStatus: "careers_page" });
    expect(opening).toMatchObject({ companyId: "co1", status: "saved", deadlineStatus: "ok", skills: ["React", "Git"] });
    expect(opening.statusHistory).toEqual([{ status: "saved", at: NOW.toISOString() }]);
  });

  it("reuses an existing company with the same name (any case)", () => {
    const first = addOpening(EMPTY_STATE, f, IDS, NOW).state;
    const second = addOpening(first, { ...f, companyName: "nimbus labs" }, { opening: "op2", company: "co2" }, NOW);
    expect(second.state.companies).toHaveLength(1);
    expect(second.opening.companyId).toBe("co1");
  });

  it("starts an opening with a past deadline as Missed", () => {
    const { opening } = addOpening(EMPTY_STATE, { ...f, deadline: "2026-10-01" }, IDS, NOW);
    expect(opening).toMatchObject({ deadlineStatus: "past", status: "missed" });
  });

  it("keeps an unconfirmed deadline flagged 'check'", () => {
    const { opening } = addOpening(EMPTY_STATE, { ...f, deadlineChecked: false }, IDS, NOW);
    expect(opening.deadlineStatus).toBe("check");
  });
});
