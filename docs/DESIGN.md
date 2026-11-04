# Design — Radar

Approved in the previous chat [USER]. Tokens live in `src/app/globals.css` (`@theme`).

## Colour
| Token | Hex | Use |
|---|---|---|
| `evening` | #192231 | Hero, sidebar, primary dark buttons, body text on light |
| `stormy` | #494E6B | Secondary text on light, active nav, radar rings |
| `cloud` | #98878F | Muted text on dark, minor dots |
| `sunset` | #985E6D | Primary action (Upload resume, Check now), fit badges, accent labels |
| `rose` | #D9A3AE | Accent italic text on dark, radar sweep |
| `beige` | #EFE6D8 | "How it works" strip, stat cards |
| `sand` | #F5EFE6 | App page background |
| `paper` | #FFFCF7 | Cards |
| `line` | #E3D8C8 | Borders, dividers |
| `danger` | #A33B3B | Failure states only |

Contrast to check (WCAG AA 4.5:1 for body text): `cloud` on `evening` is for large/label text only; `sunset` text on `sand` is for labels ≥14px uppercase.

## Type
- **Jost** 300 / 400 / 500 — everything.
- **Cormorant Garamond italic** — accent words only (hero "you've never heard of.").
- Labels: uppercase, `tracking-[0.3em]`, small, weight 400.

## Shape
- Square-ish: `rounded-none` or 2px. Thin 1px borders. No drop shadows.

## Screens (PRD §5)
1. Landing: navy hero, headline, animated SVG radar, CTA "Upload your resume" + "Try the demo", note "You always apply yourself…"; beige How it works (Discover / Watch / Match).
2. Dashboard: navy sidebar (Dashboard, Openings, Companies, Profile, "Next check"), sand page, 4 stat cards, opening cards with fit badge + reasons + warnings, watched-companies status list including failures.
3. Openings table, Opening detail, Companies, Profile.

## Icons
Inline SVG only (no icon font — the mockup's missing-glyph boxes came from an icon font that failed to load).
