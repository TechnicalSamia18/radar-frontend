**Tech Jobs Radar: Product Requirements Document**

> **This repo (radar-frontend) builds the frontend-only v1 described in §14.** Sections 1–13 are the full product plan; the backend parts live in the separate `Radar` repo for a later version.

**Version:** 0.1 (draft) · **Date:** 4 Nov 2026 · **Status:** awaiting
your approval

**1. Overview**

**Problem.** As a CS student in Pakistan, I don’t know which software
houses exist, especially smaller and lesser-known ones. I don’t know
when or where they post internships and jobs, or whether I’m eligible.
Openings are scattered across company websites, LinkedIn, Facebook and
WhatsApp groups. Students without the right network or group memberships
simply never see them.

**Solution.** A web app that:

1.  builds a list of Pakistani software houses from public sources;

2.  finds each company’s careers page or hiring email;

3.  checks those pages daily for new openings;

4.  compares each opening with my resume and explains how well I fit;

5.  tracks what I’ve applied to.

**Primary user.** Me: a 5th-semester CS student looking for internships
and entry-level roles.  
**Secondary users (later):** other students. Not in v1.

**Goal of v1.** Each week, show me new openings at software houses I’d
never have found otherwise, with clear fit and clear instructions on how
to apply.

**2. How it works**

1.  **Discover companies.** Import them from a public directory, or add
    them by hand.

2.  **Find the careers source.** For each company website, find a
    careers page, a hiring platform, or a hiring email.

3.  **Check daily.** Fetch each careers source once a day and detect
    what’s new.

4.  **Extract openings.** Pull out title, type (internship or job),
    location, requirements, deadline, and how to apply.

5.  **Match.** Compare each opening with my skills and profile and
    explain the fit.

6.  **Act.** I open the real application or email, apply myself, and
    track the status.

**3. Functional requirements**

Priority key: **Must** = needed for v1 · **Should** = v1 if time allows
· **Could** = later.

**A. Company discovery**

**REQ-001 · Must · Import companies from a directory file**

- **What it does:** imports companies (name, city, expertise, website if
  known) from a CSV.

- **Done when:** importing a CSV of 50 companies creates 50 records, and
  duplicates are skipped and reported.

**REQ-002 · Must · Add a company by hand**

- **What it does:** lets me add a company manually with name, city and
  website.

- **Done when:** the website URL is validated, and duplicate websites
  are rejected with a message.

**REQ-003 · Should · Automated directory import**

- **What it does:** imports from PSEB Tech Hub, only if permission or
  the site’s terms allow it, or from the Google Places API as the
  fallback.

- **Done when:** filtering to software and web development and a chosen
  city produces a company list.

**REQ-004 · Must · Filter out non-software companies**

- **What it does:** filters out BPOs, call centers and marketing-only
  firms using their expertise tags.

- **Done when:** filtered-out companies are hidden by default and can
  still be viewed.

**B. Careers source finder**

**REQ-010 · Must · Find the careers source on a company website**

- **What it does:** on the homepage, it finds links matching careers,
  jobs, “join us” or “hiring”, and also tries the common paths /careers
  and /jobs.

- **Done when:** each company is labelled with one of: *Careers page*,
  *Hiring platform*, *Email only*, *Nothing found*, *Site unreachable*.

**REQ-011 · Must · Recognise hiring platforms**

- **What it does:** detects links to known hiring platforms that have
  public job feeds, such as Greenhouse.

- **Done when:** jobs are fetched from the official public feed, not by
  scraping HTML.

**REQ-012 · Must · Find a hiring email**

- **What it does:** finds hiring emails (careers@, hr@, jobs@) on the
  careers or contact pages.

- **Done when:** the email is shown with an “Apply by email” action.

**REQ-013 · Should · Let me override the careers link**

- **What it does:** lets me paste the correct careers URL when detection
  was wrong.

- **Done when:** my link is used from then on and isn’t overwritten by
  later detection.

**C. Daily check and job extraction**

**REQ-020 · Must · Check all careers sources daily**

- **What it does:** runs a scheduled check of every careers source once
  a day, plus a “Check now” button.

- **Done when:** the last-checked time is stored and shown for each
  company.

**REQ-021 · Must · Detect what changed**

- **What it does:** compares each page with its previous version.

- **Done when:** the app reports “new openings”, “page changed” or “no
  change”. Cosmetic changes like dates or footers don’t trigger alerts.

**REQ-022 · Must · Extract opening details**

- **What it does:** pulls out title, type (internship, job or unclear),
  location or remote, requirements, experience needed, deadline, and
  apply link or email.

- **Done when:** missing fields show as “Not stated” and are never
  guessed.

**REQ-023 · Should · AI-assisted extraction for plain pages**

- **What it does:** uses an AI model for messy pages, with its output
  checked against a strict format.

- **Done when:** invalid AI output falls back to the “Page changed, view
  original” state. The app runs fully without an AI key.

**REQ-024 · Must · Handle image and PDF job ads**

- **What it does:** detects job ads that are only images or PDFs.

- **Done when:** these show as “New post found, open to view”, with no
  attempt to read them.

**D. Profile and resume**

**REQ-030 · Must · Upload a resume**

- **What it does:** accepts a PDF upload and extracts its text.

- **Done when:** a scanned or image-only PDF shows a clear message and
  offers manual skill entry.

**REQ-031 · Must · Detect skills**

- **What it does:** detects skills by matching the resume text against a
  skills dictionary.

- **Done when:** I can confirm, remove or add skills before saving.

**REQ-032 · Must · Save a profile**

- **What it does:** stores my semester, expected graduation, CGPA
  (optional), preferred cities, remote preference, and internship/job
  preference.

- **Done when:** the profile is used in matching, and every field can be
  edited.

**E. Matching**

**REQ-040 · Must · Fit score**

- **What it does:** scores each extracted opening by skill overlap,
  experience needed, and opening type.

- **Done when:** the score is shown with reasons (“Has: React, Git ·
  Missing: Node.js”).

**REQ-041 · Must · Eligibility warnings**

- **What it does:** flags requirements I may not meet: graduates only, a
  minimum CGPA, years of experience, or a city I didn’t choose.

- **Done when:** each warning is one line of explanation, and openings
  are never hidden just because of a warning.

**REQ-042 · Must · Openings without details**

- **What it does:** handles openings that couldn’t be extracted, such as
  “page changed” or image ads.

- **Done when:** these show “Fit unknown” instead of a score.

**F. Dashboard and workbook**

**REQ-050 · Must · Dashboard**

- **What it does:** shows summary numbers, new openings sorted by fit,
  and the status of watched companies.

- **Done when:** it matches the agreed mockup.

**REQ-051 · Must · Filters**

- **What it does:** filters by city, remote, internship or job, fit
  level, and new-only.

- **Done when:** filters can be combined and the results update
  instantly.

**REQ-052 · Must · Export**

- **What it does:** exports the openings and companies tables to Excel
  or CSV.

- **Done when:** the file opens correctly in Excel. Cell values starting
  with =, +, - or @ are neutralised so a malicious job post can’t plant
  a formula in the spreadsheet.

**G. Applying and tracking**

**REQ-060 · Must · Open the application**

- **What it does:** an “Open application” button opens the real apply
  link, or my email app with the hiring address filled in.

- **Done when:** the app never submits anything on my behalf.

**REQ-061 · Must · Track status**

- **What it does:** tracks each opening as Saved → Applied → Interview →
  Offer / Rejected, plus Missed.

- **Done when:** the date of each status change is recorded.

**REQ-062 · Should · Follow-up nudge**

- **What it does:** flags an application with no update after 7 days.

- **Done when:** the nudge shows on the dashboard.

**REQ-063 · Should · Notes**

- **What it does:** a notes field on each application for contacts and
  interview prep.

- **Done when:** notes are saved and included in the export.

**4. Failure and empty states**

**Empty states**

- **First run with no companies:** an invitation to import the starter
  list or add a company.

- **No resume yet:** a prompt to upload one. Matching is disabled, but
  the company list still works.

- **No new openings today:** “No new openings since yesterday”, with the
  last-checked time.

- **Filters return nothing:** a message saying so, with a “Clear
  filters” action.

**Failure states**

- **Site unreachable or timing out:** marked “Couldn’t reach site”. The
  app retries next day, and after 3 failures in a row asks me to check
  the link.

- **Site blocks automated access, or robots.txt disallows it:** marked
  “Site doesn’t allow automated checks”, with a link for a manual check.
  The app never tries to get around a block.

- **No careers page found:** shows the hiring email if one was found,
  otherwise “No careers info”, with an option to add a link.

- **Extraction fails or AI output is invalid:** “Page changed, view
  original”. It never shows invented data.

- **Ambiguous or past deadline:** ambiguous dates are flagged as “Check
  date”. Past deadlines move the opening to Missed.

- **Duplicate opening** (the same role on the careers page and a hiring
  platform): merged into one, with both sources kept.

- **Resume can’t be read** (scanned, encrypted or too large): a clear
  message, plus manual skill entry.

- **Invalid import file:** the import shows which rows failed and why.
  Valid rows still import.

- **Check job crashes partway:** the companies already checked are
  saved, and the rest are retried next run.

**5. Screens**

1.  **Dashboard:** summary numbers, new matched openings, and the
    watched-companies status list.

2.  **Openings table (the workbook):** all openings with filters, status
    and export.

3.  **Opening detail:** extracted fields, fit reasons, warnings, link to
    the original, apply action, status and notes.

4.  **Companies:** list, import, add, careers-source status, and link
    override.

5.  **Profile:** resume upload, skills, and preferences.

**6. Data model (draft)**

- **Company:** name, city, expertise tags, website, source (PSEB,
  Places, manual), careers source type, careers URL, hiring email, last
  checked, check status, consecutive failures.

- **Page snapshot:** company, URL, fetched at, content fingerprint,
  cleaned text.

- **Opening:** company, title, type, location, remote, requirements,
  experience, deadline, apply link or email, source URL, first seen,
  extraction confidence.

- **Profile:** skills, semester, graduation year, CGPA, cities,
  preferences.

- **Application:** opening, status, status history with dates, notes.

**7. Non-functional requirements**

- **Responsible fetching:**

  - respect robots.txt;

  - at most one request per site every few seconds;

  - check each site at most once a day;

  - identify the app honestly in its user agent;

  - no logins, no getting around blocks;

  - no LinkedIn, Facebook or WhatsApp.

- **Privacy:**

  - the resume and profile are stored only for the single user;

  - the resume isn’t sent to an AI service unless I turn that on;

  - an option to delete all my data.

- **Security:**

  - all fetched pages and AI output are treated as untrusted;

  - sanitised before display;

  - no API keys in frontend code;

  - spreadsheet export protected against formula injection;

  - dependencies scanned for known vulnerabilities before launch.

- **Reliability:** one company’s failure never stops the daily check for
  the others.

- **Performance:** the daily check of 100 companies finishes within
  roughly 15 minutes on free hosting.

- **Usability:**

  - works on mobile and desktop;

  - every state has clear wording;

  - meets basic accessibility: keyboard use, contrast, labels.

- **Run locally:** a stranger can run it from the README with no paid
  keys. AI extraction and Google Places are optional add-ons.

**8. Deliberately not implemented**

- **LinkedIn, Indeed, Facebook or WhatsApp integration:** no public job
  APIs, and their terms prohibit scraping and bots.

- **Auto-filling forms or auto-submitting applications:** every form
  differs, there are CAPTCHAs, and there’s a risk of sending wrong
  applications under my name.

- **Reading job ads from images or PDFs (OCR):** adds complexity and
  errors. These are shown as alerts instead.

- **Multi-user accounts and sharing:** v1 is a single-user tool.

- **Email or push notifications:** the dashboard is enough for v1.

- **FYP idea tracking:** a separate problem.

- **Salary insights and company reviews:** no reliable data source.

**9. Assumptions, unknowns and risks**

- **Unknown:** whether PSEB’s terms allow automated use of the Tech Hub
  directory. *Action:* read its Terms & Conditions and email PSEB.
  *Fallback:* Google Places plus manual import.

- **Unknown:** what share of Pakistani software houses have careers
  pages, hiring platforms or hiring emails. *Action:* measure it on the
  first 50 companies and report the results in the README.

- **Assumption:** most extractable openings will be on plain company
  pages rather than hiring platforms with feeds.

- **Risk:** sites change their layout and break detection. *Mitigation:*
  change detection doesn’t depend on layout, and there’s a manual link
  override.

- **Risk:** AI extraction errors. *Mitigation:* strict output checks,
  “Not stated” for missing fields, and always a link to the original.

- **Risk:** free hosting limits on scheduled jobs. *Mitigation:* choose
  a host with cron support, or use a free scheduled GitHub Action.

- **Risk:** scope creep. *Mitigation:* anything not in this document
  goes into a backlog, not the code.

**10. Success metrics**

- I find at least **5 relevant openings** I wouldn’t otherwise have seen
  within the first month of use.

- For at least **50 companies**, the app correctly classifies the
  careers source. I’ll verify a sample of 20 by hand and report the
  accuracy.

- The daily check completes without crashing even when some sites fail.

- A stranger can run it locally from the README in under 15 minutes.

**11. Milestones**

Build these in order, with small commits, so the repository history
shows the build:

1.  **Setup:** project skeleton, README stub, profile and resume upload
    (REQ-030–032).

2.  **Companies:** CSV import and manual add (REQ-001, 002, 004).

3.  **Careers finder:** REQ-010–012, with failure states.

4.  **Daily check and change detection:** REQ-020, 021, 024.

5.  **Extraction:** rules first (REQ-022), then the optional AI step
    (REQ-023).

6.  **Matching:** REQ-040–042.

7.  **Dashboard, filters and export:** REQ-050–052.

8.  **Tracking:** REQ-060–063.

9.  **Polish:** empty and failure states, accessibility, security
    checks.

10. **Deploy:** recording, README with the “not implemented” section and
    measured results.

**12. Open decisions before building**

1.  **Tech stack:** for example Next.js with a hosted Postgres, or
    Python (FastAPI) with React. It depends on what you already know.

2.  **Hosting:** which free host supports a daily scheduled job.

3.  **AI extraction:** include it in v1, or add it after the rules-based
    version works.

4.  **Company source:** PSEB, depending on their answer, or Google
    Places from the start.

**13. v1 scope (decided 4 Nov 2026)**

The full PRD was estimated at 11–13 build hours; the assignment asks for a small app. v1 keeps the core loop plus the features used every week, and moves the rest to “Deliberately not implemented” with a reason.

| Area | In v1 | Not in v1 (reason) |
|---|---|---|
| Discovery | REQ-001 CSV import, REQ-002 add by hand, REQ-004 non-software filter, **REQ-003 automated discovery via OpenStreetMap (free, no key)** | Google Places: needs a card on file and bills past the free allowance (free-only rule). Automated PSEB import: its terms for automated use are unknown; PSEB data can still come in by CSV |
| Careers source | REQ-010, REQ-012, REQ-013 override | REQ-011 hiring-platform feeds: few Pakistani software houses use them; their pages are still read as normal careers pages |
| Checking | REQ-020, REQ-021, REQ-024 | — |
| Extraction | REQ-022 (rules-based) | REQ-023 AI extraction: the app must work without it; adds a paid key and a new failure mode |
| Matching | REQ-040, REQ-041 (all warnings), REQ-042 | — |
| Dashboard | REQ-050, REQ-051 combined filters, REQ-052 as CSV (formula-safe) | Excel (.xlsx): CSV opens in Excel; one fewer dependency |
| Tracking | REQ-060, REQ-061, REQ-062, REQ-063 | — |
| Failure states | All of §4 | Duplicate-opening merging: rare in practice; duplicates show twice |
| Hosting | Public read-only demo with fictional sample data built into the app (no hosted database); real data runs locally in SQLite | Online login (Auth.js) + delete-my-data: Auth.js v5 is still beta and a login adds risk; local data is also the most private |

**Free-only rule (4 Nov 2026, user):** nothing paid. If a free option exists we use it; otherwise the feature is skipped. Google Places and Turso are therefore not used.

**14. Frontend-only v1 (decided 4 Nov 2026)**

The assignment is for a **frontend** internship, so v1 runs entirely in the browser: no server, no database, no scheduled job. It deploys as a free static site.

- **In v1:** resume PDF read in the browser (never uploaded) → skills; paste an opening you found → title, type, location, skills, experience, deadline and how to apply are extracted ("Not stated" when missing); fit score with reasons and eligibility warnings; tracker (Saved → Applied → Interview → Offer / Rejected, Missed) with dates, notes and a 7-day nudge; dashboard, combined filters, CSV export (formula-safe); companies list with careers-source status; one-click demo data (fictional companies); all loading / empty / error states.
- **Storage:** the browser's localStorage, validated with Zod on every load (corrupt data → clear error + reset option). All reads and writes go through one repository interface so a real backend can replace it later.
- **Later (backend version):** automatic discovery, careers-page finder, daily check, change detection (REQ-003, 010–012, 020–021, 024 automation). Their screens and states exist now with sample data.
