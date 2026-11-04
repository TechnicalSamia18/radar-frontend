# Assumptions & unknowns

| ID | Assumption / unknown | Tag | How we'll confirm | Status |
|---|---|---|---|---|
| A-01 | Demo data uses fictional companies (Nimbus Labs, Kestrel Systems…), labelled as sample data | [USER] | Confirmed 2026-11-04 | Closed |
| A-02 | unpdf's pdf.js build runs in the browser without a separate worker file | [ASSUMED] | Playwright test in Chromium (F2) | Open |
| A-03 | Pasted job posts are short (< 20,000 characters) | [ASSUMED] | Enforced by the form; message if longer | Open |
