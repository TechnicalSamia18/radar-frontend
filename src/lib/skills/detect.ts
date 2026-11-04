// Finds known skills in free text (resume now, job requirements later).
//
// How it works: every alias becomes a regular expression with "token
// boundaries" — the character before and after must not be a letter, digit
// or one of + # . — so "java" doesn't match inside "javascript" and "c"
// doesn't match inside "c++".
import { SKILLS, type SkillEntry } from "./dictionary";

const MAX_TEXT_LENGTH = 200_000; // resumes are short; cap work on hostile input

// Characters that count as part of a skill token.
const TOKEN_CHAR = "[\\p{L}\\p{N}+#]";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function boundaryRegex(alias: string, flags: string) {
  // A trailing "." (end of sentence) is fine, but ".js" style suffixes are not.
  return new RegExp(`(?<!${TOKEN_CHAR}|\\.)${escapeRegex(alias)}(?!${TOKEN_CHAR}|\\.${TOKEN_CHAR})`, flags);
}

// One entry per alias, longest alias first. Longer names are matched first and
// then blanked out, so "Tailwind CSS" doesn't also count as "CSS" and
// "React Native" doesn't also count as "React".
type Pattern = { skill: string; index: number; re: RegExp; length: number };

const PATTERNS: Pattern[] = SKILLS.flatMap((s: SkillEntry, index) => [
  ...s.aliases.map((a) => ({ skill: s.name, index, re: boundaryRegex(a, "giu"), length: a.length })),
  ...(s.exact ?? []).map((a) => ({ skill: s.name, index, re: boundaryRegex(a, "gu"), length: a.length })),
]).sort((a, b) => b.length - a.length);

/** Returns canonical skill names found in `text`, in dictionary order, without duplicates. */
export function detectSkills(text: string): string[] {
  let input = text.slice(0, MAX_TEXT_LENGTH);
  const found = new Map<string, number>(); // skill → dictionary position
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    if (!p.re.test(input)) continue;
    found.set(p.skill, p.index);
    // Replace the matched text with spaces of the same length so shorter aliases can't match inside it.
    input = input.replace(p.re, (m) => " ".repeat(m.length));
  }
  return [...found.entries()].sort((a, b) => a[1] - b[1]).map(([skill]) => skill);
}

/**
 * Maps something the user typed ("reactjs", "  Node ") to the dictionary's
 * display name when we know it; otherwise returns the trimmed text unchanged.
 */
export function canonicalSkill(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  const lower = trimmed.toLowerCase();
  const hit = SKILLS.find(
    (s) => s.name.toLowerCase() === lower || s.aliases.includes(lower) || (s.exact ?? []).includes(trimmed),
  );
  return hit ? hit.name : trimmed;
}
