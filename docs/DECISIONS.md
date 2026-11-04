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
