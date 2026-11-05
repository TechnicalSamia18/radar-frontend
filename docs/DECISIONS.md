# Decisions (ADR log)

## ADR-001: Browser-only stack
- **Date:** 2026-11-04 · **Status:** Accepted [USER]
- **Context:** this project is for a frontend internship application. Reviewers judge UI quality, states, accessibility and component design. The full Radar plan (discovery, careers-page finder, daily checks) is backend work and lives in the separate `Radar` repo.
- **Decision:**
  - Next.js 16.4.3 (TypeScript, App Router) + React 19.3.1 + Tailwind CSS 4.3.3
  - Data in the browser's localStorage, behind one repository interface, validated with Zod 4.6.7
  - Resume PDFs read in the browser with unpdf 1.9.1 (the file never leaves the device)
  - Dates in pasted job posts read with chrono-node 2.10.3
  - Vitest for logic, Playwright for page tests; Vercel Hobby for hosting
- **Consequences:** free static hosting, no secrets, strong privacy. Openings are added by pasting a job post; nothing is discovered automatically. A backend can replace the repository later without changing components.

## ADR-002: Fonts via `next/font/google`
- Jost + Cormorant Garamond are downloaded at build time and self-hosted; the visitor's browser makes no request to Google [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md, line 13].

## ADR-003: Free-only rule
- **Date:** 2026-11-04 · **Status:** Accepted [USER]
- Nothing paid. Use a free option if one exists, otherwise skip the feature.

## ADR-004: Shared code copied from the Radar repo
- **Date:** 2026-11-04 · **Status:** Accepted
- The design system, landing page, skill detector and resume reader were written first in `TechnicalSamia18/Radar` and copied here with their tests, then adapted to run in the browser.

## ADR-005: Live openings from a daily watcher (still no server)
- **Date:** 2026-11-05 · **Status:** Accepted [USER]
- **Context:** the paste-only version didn't solve the real problem (finding openings). A coverage check of 45 companies (docs/coverage/results.md) showed public hiring-platform feeds give clean, real openings; plain careers pages are too varied to parse reliably.
- **Decision:** a dependency-free Node watcher runs daily on GitHub Actions, reads public job feeds, fingerprints plain careers pages to detect changes, and commits `public/feed/*.json`. The website reads those files and scores them in the browser. The watcher's commits are authored by github-actions[bot].
- **Consequences:** still free and serverless; coverage limited to companies that publish openly (3 of 43 feeds on day one, 33 relevant openings); careers-page companies give "changed" alerts, not parsed jobs. Fit score gained a seniority cap and a thin-evidence discount after real data ranked a lead role first.
