// Reads a resume PDF and returns its text plus the skills found in it (REQ-030, REQ-031).
//
// Every way this can fail returns a clear reason instead of throwing, so the
// profile page can show a message and offer manual skill entry (PRD §4:
// "Resume can't be read (scanned, encrypted or too large)").
// The PDF itself is never stored; only the skills the user confirms are saved.
import { extractText, getDocumentProxy } from "unpdf";
import { detectSkills } from "@/lib/skills/detect";
import { MAX_RESUME_BYTES, MAX_RESUME_PAGES, RESUME_MESSAGES, type ResumeFailure } from "./messages";

export { MAX_RESUME_BYTES, RESUME_MESSAGES };

// Fewer non-space characters than this means there is no real text layer (scanned image).
const MIN_TEXT_CHARS = 40;

export type ResumeResult =
  | { ok: true; text: string; skills: string[]; pages: number }
  | { ok: false; reason: ResumeFailure; message: string };

function fail(reason: ResumeFailure): ResumeResult {
  return { ok: false, reason, message: RESUME_MESSAGES[reason] };
}

/** True when the bytes start with the PDF signature "%PDF-" (we don't trust the file name or MIME type). */
export function looksLikePdf(bytes: Uint8Array): boolean {
  const sig = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  // The spec allows a little junk before the header; check the first 1 KB.
  const limit = Math.min(bytes.length - sig.length, 1024);
  for (let i = 0; i <= limit; i++) {
    if (sig.every((b, j) => bytes[i + j] === b)) return true;
  }
  return false;
}

export async function extractResume(bytes: Uint8Array): Promise<ResumeResult> {
  if (bytes.length === 0) return fail("empty");
  if (bytes.length > MAX_RESUME_BYTES) return fail("too_large");
  if (!looksLikePdf(bytes)) return fail("not_pdf");

  let pdf;
  try {
    // pdf.js takes ownership of the buffer it's given, so pass a copy.
    pdf = await getDocumentProxy(new Uint8Array(bytes), { stopAtErrors: false });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "PasswordException") return fail("encrypted");
    return fail("unreadable");
  }

  try {
    if (pdf.numPages > MAX_RESUME_PAGES) return fail("too_many_pages");
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS) return fail("no_text");
    return { ok: true, text, skills: detectSkills(text), pages: totalPages };
  } catch {
    return fail("unreadable");
  } finally {
    // Frees the parser and its worker; ignore errors during cleanup.
    await pdf.loadingTask.destroy().catch(() => {});
  }
}
