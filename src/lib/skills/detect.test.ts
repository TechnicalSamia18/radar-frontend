import { describe, expect, it } from "vitest";
import { canonicalSkill, detectSkills } from "./detect";

describe("detectSkills", () => {
  it("finds skills written in different ways", () => {
    const text = "Built apps with ReactJS, Node and Tailwind. Comfortable with Git/GitHub and FastAPI.";
    expect(detectSkills(text)).toEqual(
      expect.arrayContaining(["React", "Node.js", "Tailwind CSS", "Git", "FastAPI"]),
    );
  });

  it("does not match a skill inside a longer word", () => {
    const found = detectSkills("JavaScript developer");
    expect(found).toContain("JavaScript");
    expect(found).not.toContain("Java");
  });

  it("tells C, C++ and C# apart", () => {
    expect(detectSkills("Languages: C, C++, C#")).toEqual(expect.arrayContaining(["C", "C++", "C#"]));
    expect(detectSkills("Languages: C++ only")).not.toContain("C");
  });

  it("ignores ordinary words that look like short skill names", () => {
    const found = detectSkills("I like to go hiking. Got grade c in R&D? no.");
    expect(found).not.toContain("Go");
    expect(found).not.toContain("C");
  });

  it("lets a longer skill name win over a shorter one inside it", () => {
    expect(detectSkills("Mobile apps in React Native")).toEqual(["React Native"]);
    expect(detectSkills("Styled with Tailwind CSS")).toEqual(["Tailwind CSS"]);
    expect(detectSkills("Apps in React Native and React")).toEqual(["React", "React Native"]);
  });

  it("accepts a skill at the end of a sentence", () => {
    expect(detectSkills("I mostly use Python.")).toContain("Python");
  });

  it("returns nothing for empty or unrelated text", () => {
    expect(detectSkills("")).toEqual([]);
    expect(detectSkills("Pharmacology, cooking, cricket")).toEqual([]);
  });

  it("returns each skill once", () => {
    const found = detectSkills("react React REACT reactjs");
    expect(found.filter((s) => s === "React")).toHaveLength(1);
  });

  it("handles very long hostile input quickly", () => {
    const start = Date.now();
    detectSkills("a".repeat(5_000_000));
    expect(Date.now() - start).toBeLessThan(2000);
  });
});

describe("canonicalSkill", () => {
  it("maps known aliases to the display name", () => {
    expect(canonicalSkill("  reactjs ")).toBe("React");
    expect(canonicalSkill("NODE")).toBe("Node.js");
  });

  it("keeps unknown skills as typed, with whitespace tidied", () => {
    expect(canonicalSkill("  Three.js   shaders ")).toBe("Three.js shaders");
  });
});
