import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_RESUME_BYTES, extractResume, looksLikePdf } from "./extract";
import { makePdf } from "./test-pdf";

describe("extractResume", () => {
  it("reads text and detects skills from a normal PDF", async () => {
    const pdf = makePdf([
      "Ayesha Khan - BS Computer Science",
      "Skills: React, TypeScript, Git, Python, SQL",
      "Built a FastAPI service with PostgreSQL",
    ]);
    const result = await extractResume(pdf);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pages).toBe(1);
    expect(result.skills).toEqual(
      expect.arrayContaining(["React", "TypeScript", "Git", "Python", "SQL", "FastAPI", "PostgreSQL"]),
    );
  });

  it("says a scanned PDF (no text layer) can't be read", async () => {
    const result = await extractResume(makePdf([]));
    expect(result).toMatchObject({ ok: false, reason: "no_text" });
  });

  it("says a password-protected PDF can't be read", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("./fixtures/encrypted.pdf", import.meta.url)));
    const result = await extractResume(bytes);
    expect(result).toMatchObject({ ok: false, reason: "encrypted" });
  });

  it("rejects a file that is not a PDF even if it is named .pdf", async () => {
    const fake = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect(await extractResume(fake)).toMatchObject({ ok: false, reason: "not_pdf" });
  });

  it("rejects an empty file", async () => {
    expect(await extractResume(new Uint8Array())).toMatchObject({ ok: false, reason: "empty" });
  });

  it("rejects a file over 4 MB without parsing it", async () => {
    const big = new Uint8Array(MAX_RESUME_BYTES + 1);
    big.set(new TextEncoder().encode("%PDF-1.4"));
    expect(await extractResume(big)).toMatchObject({ ok: false, reason: "too_large" });
  });

  it("reports a damaged PDF as unreadable instead of crashing", async () => {
    const broken = new TextEncoder().encode("%PDF-1.4\n1 0 obj << /Type /Catalog >> garbage garbage");
    const result = await extractResume(broken);
    expect(result.ok).toBe(false);
  });

  it("gives every failure a human-readable message", async () => {
    const result = await extractResume(makePdf([]));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/add your skills by hand/i);
  });
});

describe("looksLikePdf", () => {
  it("checks the file signature, not the name", () => {
    expect(looksLikePdf(new TextEncoder().encode("%PDF-1.7 ..."))).toBe(true);
    expect(looksLikePdf(new TextEncoder().encode("PK\u0003\u0004 docx"))).toBe(false);
  });
});
