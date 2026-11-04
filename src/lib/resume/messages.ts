// Resume limits and user-facing messages, shared by the server-side extractor
// and the browser form (which checks size before uploading). No dependencies.

// The PDF is read in the browser; 4 MB is a sanity limit (a resume is usually < 1 MB).
export const MAX_RESUME_BYTES = 4 * 1024 * 1024;
export const MAX_RESUME_PAGES = 10;

export type ResumeFailure = "empty" | "too_large" | "not_pdf" | "encrypted" | "too_many_pages" | "no_text" | "unreadable";

export const RESUME_MESSAGES: Record<ResumeFailure, string> = {
  empty: "That file is empty. Choose your resume PDF and try again.",
  too_large: "That file is over 4 MB. Export a smaller PDF, or add your skills by hand below.",
  not_pdf: "That doesn't look like a PDF. Upload a .pdf file, or add your skills by hand below.",
  encrypted: "This PDF is password-protected, so Radar can't read it. Remove the password or add your skills by hand below.",
  too_many_pages: "That PDF has more than 10 pages. Upload just your resume, or add your skills by hand below.",
  no_text:
    "This PDF looks scanned (it's an image with no selectable text), so Radar can't read it. Add your skills by hand below.",
  unreadable: "Radar couldn't read this PDF. It may be damaged. Add your skills by hand below.",
};
