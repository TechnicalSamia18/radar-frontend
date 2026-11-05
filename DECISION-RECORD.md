# Radar — decision record

The three decisions in this project that would cost the most to undo, written so they can be followed without reading the code. For how to run the project, see the [README](README.md).

**What Radar is, in one paragraph.** Radar helps a CS student in Pakistan find internships and junior jobs at local software houses. Every morning it checks a list of companies for openings, scores each opening against the student's resume ("74% fit: you have React and Node.js, you're missing REST APIs"), warns about eligibility catches ("asks for graduates; you finish in 2028"), and keeps track of applications. Openings found elsewhere can be pasted in.

---

## Decision 1: Keep all personal data in the user's browser, with no server and no accounts

**Decided:** 4 Nov 2026 · **Status:** in place, and has proved awkward (see below)

### What was decided
The website has no server of its own and no database. The resume, profile, saved openings, application statuses and notes are stored in the browser on the user's device (in "localStorage", a small storage area every browser gives each website). The resume PDF is read on the device and thrown away; only the skills the user confirms are kept.

### Alternatives that were actually considered
1. **A normal web app with a database and a login.** This was the original plan: SQLite locally and a hosted database (Turso) in production, with a login so only I could see my data. Half of it was built in an earlier repository before I changed course.
2. **A hosted backend service** such as Supabase or Firebase, which provide a database and logins without running your own server.
3. **Browser-only storage.** Chosen.

### Why this one
- **The project is for a frontend internship.** Reviewers judge the interface, its states and its accessibility. A login system and database would take time away from that and demonstrate little of it.
- **Privacy by default.** A resume holds personal details. If it never reaches a server, it can't leak from one.
- **Free and simple to run.** A stranger can run it with `npm ci && npm run dev` and no accounts or keys. Hosting is a free static site.
- **Less risk.** The login library I'd have used (Auth.js v5) was still a beta release.

### What it costs
- **The data lives in one browser on one device.** No phone and laptop in sync. Clearing the browser's site data wipes everything. The only backup is a CSV export, and there's no matching import for openings, so a backup can't be restored.
- **No reminders outside the app.** Without a server, Radar can't email you that an application needs a follow-up. You only see the nudge when you open the dashboard.
- **Every change to the data format is a migration in every user's browser.** I can't fix stored data centrally. When I later added "saved from the live feed" and "hidden" fields, I had to make the app quietly fill in defaults for data saved before the change. Every future change carries the same chore.
- **Small storage.** Browsers give each site only a few megabytes, enough for thousands of openings but not for keeping full job descriptions forever.
- **Why it's expensive to reverse:** adding accounts later means building logins, a database and a privacy policy, *and* moving each existing user's data out of their own browser, which only they can do.

### How it proved awkward
The first browser-only version had a bigger hidden cost than any of the above. A website with no server couldn't **find** openings at all, since fetching other companies' websites needs a machine running on a schedule. So the first version only let you paste openings you'd already found. When I used it, I realised it didn't solve my actual problem ("I don't know which companies are hiring"); it only organised openings I already had, and the demo looked full only because of made-up sample data. That forced Decision 2, which adds a scheduled job outside the website while keeping personal data in the browser.

---

## Decision 2: Find openings with a daily GitHub Actions job that saves its results into the code repository

**Decided:** 5 Nov 2026 · **Status:** in place, and has proved awkward

### What was decided
A small program (the "watcher") runs once a day at 06:17 Pakistan time on GitHub Actions, GitHub's free service for running scripts. It checks each company on a list, writes what it found to two files (`public/feed/openings.json` and `public/feed/companies.json`), and **commits those files to the project's repository**. The hosting service sees the new commit and republishes the site, and the website reads the two files.

### Alternatives that were actually considered
1. **A scheduled serverless function plus a hosted database** (for example a Vercel cron job writing to a database). This is the "proper" architecture, but it needs a database, and it brings back the server-side code Decision 1 avoided.
2. **Run the checks inside the user's browser** each time they open the site. Browsers block most cross-site requests, and it would mean every visitor hitting every company's website. That's rude to the companies and slow for the user.
3. **Run the watcher during each website build** and keep its results only in the build. That has no way to remember yesterday's results, which "this page changed" alerts need, unless they're stored somewhere anyway.
4. **Paid job-scraping APIs.** Ruled out by the project's "nothing paid" rule.
5. **GitHub Actions committing results to the repository.** Chosen.

### Why this one
- **Free, with no server and no secrets.** The website stays a static site and the personal data stays in the browser.
- **Auditable.** Every daily run and every change in the results is visible in the repository's history, so anyone can check what Radar saw on a given day.
- **Robust.** If the run fails or crashes partway, yesterday's files stay in place and the site keeps working with slightly older data.

### What it costs
- **Results are up to a day old.** An opening posted at 9am appears the next morning. Fine for internships, which stay open for weeks; not fine for anything time-critical.
- **The repository fills with automated commits.** One "data: daily watcher update" commit a day, authored by `github-actions[bot]` rather than by me. This clutters the history reviewers read, and the repository grows a little each day, because git keeps every old version of the data files.
- **It depends on GitHub keeping the schedule running.** According to GitHub's documentation, in a public repository scheduled workflows are switched off automatically when there has been no repository activity for 60 days. If I stop working on the project for two months, Radar silently stops updating. The daily bot commits don't reliably count as activity, and the site would keep showing old openings without saying so loudly.
- **Two moving parts must agree.** GitHub runs the watcher and the hosting service (Vercel) publishes the site. If either misbehaves, the site can show stale data with no error.
- **Why it's expensive to reverse:** the website, the tests and the watcher all assume "the results are two JSON files at a fixed address". Moving to a database means changing all three and finding a free place to run the job.

### How it proved awkward
- **The very first run checked zero companies.** The list of companies sat in a folder that an old rule (left over from the database version) told git to ignore, so it never reached GitHub. The job reported success with nothing done. Because results flow through commits, a mistake in what gets committed is a silent failure. I added a test that simulates every site failing, but nothing yet alerts me when a run checks suspiciously few companies.
- **Authorship.** I wanted every commit in the repository to be mine. The data commits can't be, because they're made by the automation. I accepted that and documented it, but it's a visible compromise.

---

## Decision 3: Only report openings that companies publish in a structured feed; never guess jobs from web pages, and never scrape LinkedIn

**Decided:** 5 Nov 2026, after a measured coverage check · **Status:** in place; its cost is visible every day

### What was decided
Radar treats a company in one of two ways:
- If the company posts its jobs through a hiring platform that offers an **official public job feed** (Workable, Greenhouse, Lever, Ashby and similar), Radar reads the openings from that feed: exact titles, cities and apply links.
- If the company only has its **own careers page**, Radar does **not** try to work out which jobs are on it. It remembers a fingerprint of the page's text (ignoring dates and copyright lines) and tells the user "this careers page changed, have a look", with the role names it noticed shown only as a hint.

Radar never visits LinkedIn, Indeed, Facebook or WhatsApp. It respects each site's `robots.txt` (the file where a website says what automated visitors may and may not do), names itself honestly in every request, and checks each company at most once a day.

### Alternatives that were actually considered
1. **Read job titles out of each careers page's HTML** with general rules. I measured this in the coverage check: about 20 of 45 pages produced something, but much of it was marketing text ("cloud & devops infrastructure", "executive briefs"), not jobs.
2. **Use an AI model to read each careers page.** It would handle messy pages better, but it needs a paid key (against the free-only rule) and can invent jobs that don't exist, the one error a job tool must never make.
3. **Use a headless browser** (a real browser run by a script) to load pages that build their job list with JavaScript. It's possible on GitHub Actions, but slow and fragile, and it still leaves the "which text is a job?" problem.
4. **Scrape LinkedIn or Rozee.pk,** where most Pakistani openings actually appear. Ruled out because their terms forbid it.
5. **Public feeds only, plus change alerts for everything else.** Chosen.

### Why this one
- **Accuracy over coverage.** Every live opening Radar shows is real and links to the real posting. A wrong "opening" wastes a student's time and erodes trust in the whole tool.
- **Respect for the sites and their terms.** Reading feeds that companies publish *for* job seekers is clearly acceptable. Mass-scraping social networks is not.
- **It's measurable.** Before building, I checked 45 companies (see `docs/coverage/results.md`), so the trade-off below was known in advance rather than discovered by users.

### What it costs
- **Coverage is small.** On day one only **3 of 43** companies published an open feed (Devsinc, Motive, Educative). Together they gave **33 relevant openings**. Some of the best-known software houses, including Arbisoft, 10Pearls and Systems Limited, give only "page changed" alerts, which means the student still has to click through and read the page.
- **Entry-level roles are thin.** Only 6 of those 33 were intern, junior or associate tech roles. Radar is most useful as one source among several, not as the complete picture.
- **The largest source of Pakistani openings is out of reach.** LinkedIn and WhatsApp groups are where many jobs appear first, and Radar will never read them. The user has to paste those in by hand.
- **Results depend on other companies' choices.** Devsinc alone supplied 21 of the 33 openings on day one; if it moved off Workable tomorrow, nearly two-thirds of Radar's openings would disappear overnight, and there's nothing I could do about it.
- **Why it's expensive to reverse:** the product's promise ("everything shown is real") and its tests are built around this rule. Adding guessed or AI-extracted jobs later would need a new way to label "unverified" openings in every screen, and would weaken that promise.

### Where it bit
Real data exposed a problem the rule couldn't prevent: the feeds are accurate but not *tailored*. The first live run ranked a "Lead Support Engineer" role first at **100% fit**, because its post named a single skill the test profile happened to have, and it let through "United States – Remote" roles that aren't open to someone in Pakistan. Accurate data still needed judgement. I added filters for location and role type, capped senior roles at a low fit, and stopped posts that name only one or two skills from scoring high.

---

## The three decisions together

| | Gains | Main cost |
|---|---|---|
| 1. Data stays in the browser | Privacy, free, simple to run | One device only, no reminders, migrations happen in every browser |
| 2. Daily job commits results to the repo | Free, auditable, no server | Day-old data, bot commits, stops after 60 quiet days |
| 3. Feeds only, no guessing, no LinkedIn | Every live opening is real | 3 of 43 companies give live openings; most still need a manual look |

The smaller decisions (exact library versions, the fit-score weights, the design system) are logged in [`docs/DECISIONS.md`](docs/DECISIONS.md).
