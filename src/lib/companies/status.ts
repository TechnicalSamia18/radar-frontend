// How a company's careers source is shown in lists (REQ-010 labels + PRD §4 failure states).
import type { Company } from "@/lib/data/schema";

export function companyStatus(c: Company): { text: string; tone: "ok" | "muted" | "bad" } {
  switch (c.careersStatus) {
    case "careers_page":
      return { text: "Careers page", tone: "ok" };
    case "email_only":
      return { text: c.hiringEmail ? `Email only · ${c.hiringEmail}` : "Email only", tone: "ok" };
    case "nothing_found":
      return { text: "No careers info", tone: "muted" };
    case "unreachable":
      return c.failures >= 3
        ? { text: `Couldn't reach site ${c.failures} times. Check the link.`, tone: "bad" }
        : { text: "Couldn't reach site", tone: "bad" };
    case "blocked":
      return { text: "Site doesn't allow automated checks. Check it yourself.", tone: "bad" };
    case "not_checked":
      return { text: "Not checked yet", tone: "muted" };
  }
}

export const TONE_CLASS = { ok: "text-stormy", muted: "text-cloud", bad: "text-danger" } as const;
