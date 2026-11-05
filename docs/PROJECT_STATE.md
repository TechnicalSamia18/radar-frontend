# Project State — Radar (frontend)

- **Phase:** 5 — Development · **Mode:** Lite (SDLC blueprint)
- **Stack:** Next.js 16.4.3 + Tailwind 4.3.3, browser-only (localStorage + Zod), unpdf in the browser, chrono-node — ADR-001
- **Hosting:** Vercel Hobby (free, static) — live at https://radar-frontend-pi.vercel.app
- **Scope:** PRD §14 + live openings from a daily watcher (ADR-005). Free-only rule.
- **Next action:** owner imports the repo into Vercel (free Hobby plan), then add the live URL to the README and record a short demo video.
- **Last updated:** 2026-11-05

## Milestones
| # | Milestone | Status |
|---|---|---|
| F0 | Setup, docs, design system, landing page | Done |
| F1 | Shared logic: skill detector, resume reader (browser); browser storage | Done |
| F2 | Profile page (resume → skills → preferences) + app navigation | Done |
| F3 | Paste-an-opening extraction (rules) + Add opening screen | Done |
| F4 | Matching: fit score, reasons, eligibility warnings | Done |
| F5 | Dashboard + demo data + companies | Done |
| F6 | Openings list: combined filters, CSV export | Done |
| F7 | Opening detail: tracker, dates, notes, 7-day nudge | Done |
| F8 | Polish (a11y, states), Playwright tests, CI, README, deploy | Done except deploy (needs the owner's Vercel account) |
| L1 | Coverage check of 45 companies | Done (docs/coverage) |
| L2 | Daily watcher on GitHub Actions + live openings UI | Done |

## Checks at last update (2026-11-05)
140 unit tests + 33 Playwright page tests (desktop + phone) pass · lint and production build clean · CI on every push · daily watcher running (43 companies, 33 live openings on day one).

## Gate log
| Gate | Date | Result | Notes |
| :--- | :--- | :--- | :--- |
| Gate 1 (scope + stack) | 2026-11-04 | APPROVED [USER] | Frontend-only v1 chosen for a frontend internship application |
| Go/No-Go (deploy) | 2026-11-05 | APPROVED [USER] | Deployed by the owner to Vercel |
