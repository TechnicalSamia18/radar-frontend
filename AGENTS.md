<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — rules for any AI coding agent in this repo

## Project
- Radar (frontend): a browser-only job tracker for CS students in Pakistan. Spec: `docs/PRD.md` §14. State: `docs/PROJECT_STATE.md`.
- Install: `npm ci` · Run: `npm run dev` · Test: `npm test` · Lint: `npm run lint` · Build: `npm run build`

## Hard rules
- No server code: no Server Actions, route handlers or databases. All data goes through `src/lib/data/repository.ts`.
- Validate everything read from localStorage and every form with Zod. Reject, don't repair.
- Pasted job posts are untrusted: render as text only, never `dangerouslySetInnerHTML`. Links only if `http(s):`; email links only for valid addresses.
- CSV export neutralises cells starting with `= + - @`, tab or CR.
- Nothing paid. Pin exact versions (≥3 days old, no Critical/High advisory); log in `docs/DEPENDENCIES.md`. New packages need the owner's approval.
- Follow `docs/DESIGN.md`. Every screen has loading, empty, error and success states, works at 320 px, and is keyboard-usable.
- Ship tests with code. Report real output; say NOT RUN if a check wasn't run.
- Commit only to `main`. Commits are authored by the repo owner.
