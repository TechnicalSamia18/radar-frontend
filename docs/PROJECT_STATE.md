# Project State — Radar (frontend)

- **Phase:** 5 — Development · **Mode:** Lite (SDLC blueprint)
- **Stack:** Next.js 16.4.3 + Tailwind 4.3.3, browser-only (localStorage + Zod), unpdf in the browser, chrono-node — ADR-001
- **Hosting:** Vercel Hobby (free, static)
- **Scope:** PRD §14. Free-only rule. Backend features live in the `Radar` repo for later.
- **Next action:** F5 — dashboard + one-click demo data + companies page. Note: saving an opening redirects to `/openings/detail?id=…`, which is built in F7.
- **Last updated:** 2026-11-04

## Milestones
| # | Milestone | Status |
|---|---|---|
| F0 | Setup, docs, design system, landing page | Done |
| F1 | Shared logic: skill detector, resume reader (browser); browser storage | Done |
| F2 | Profile page (resume → skills → preferences) + app navigation | Done |
| F3 | Paste-an-opening extraction (rules) + Add opening screen | Done |
| F4 | Matching: fit score, reasons, eligibility warnings | Done |
| F5 | Dashboard + demo data + companies | — |
| F6 | Openings list: combined filters, CSV export | — |
| F7 | Opening detail: tracker, dates, notes, 7-day nudge | — |
| F8 | Polish (a11y, states), Playwright tests, README, deploy | — |

## Checks at last update (2026-11-04)
79 unit tests pass · tsc, eslint, next build clean · Chromium runs of profile and Add opening flows: no console errors.

## Gate log
| Gate | Date | Result | Notes |
| :--- | :--- | :--- | :--- |
| Gate 1 (scope + stack) | 2026-11-04 | APPROVED [USER] | Frontend-only v1 chosen for a frontend internship application |
| Go/No-Go (deploy) | | | |
