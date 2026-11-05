# Dependencies — Radar (frontend)

Rule: newest patch on a supported line, at least 3 days old, no Critical/High advisory, exact pin, lockfile committed, free/open source only.
Scan: `npm run audit` (runs in CI on every push and pull request). It fails on any moderate-or-worse advisory in production dependencies, and on any High/Critical advisory in any dependency.

| Package | Kind | Version | Why | License | Released | Last scan | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| next | prod | 16.4.3 | Framework | MIT | 2026-10-23 | 2026-11-04 | clean |
| react / react-dom | prod | 19.3.1 | UI | MIT | 2026-10-14 | 2026-11-04 | clean |
| zod | prod | 4.6.7 | Validate forms + stored data | MIT | 2026-10-12 | 2026-11-04 | clean |
| unpdf | prod | 1.9.1 | Resume PDF → text in the browser (bundles pdf.js ~6.4.299) | MIT | 2026-10-19 | 2026-11-04 | clean |
| chrono-node | prod | 2.10.3 | Read deadlines like "20th Nov" or "next Friday"; zero deps | MIT | 2026-10-12 | 2026-11-04 | clean |
| tailwindcss + @tailwindcss/turbopack | dev | 4.3.3 | Styling | MIT | 2026-07-16 | 2026-11-04 | clean |
| typescript | dev | 5.9.3 | Types | Apache-2.0 | 2025-09-30 | 2026-11-04 | clean |
| vitest | dev | 5.0.5 | Unit tests | MIT | 2026-10-15 | 2026-11-04 | clean |
| @playwright/test | dev | 1.63.0 | Page tests in Chromium (matches the local browser build) | Apache-2.0 | 2026-09-04 | 2026-11-05 | clean |
| actions/checkout, actions/setup-node | CI | v7.0.1, v7.1.0 (pinned to commit SHA) | GitHub Actions CI | MIT | — | — | — |
| eslint + eslint-config-next | dev | 9.39.5 / 16.4.3 | Lint | MIT | — | 2026-11-04 | 1 moderate (below) |

## Open advisories (`npm audit`, 2026-11-05)
| Advisory | Component | Severity | Reachable? | Action |
| :--- | :--- | :--- | :--- | :--- |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | minimatch <11.0.1 via ESLint 9 plugins | Moderate | No: slowdown on hostile glob patterns; lint only reads our own files; dev-only | Accept; re-check on ESLint upgrade |
