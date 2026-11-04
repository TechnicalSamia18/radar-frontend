# Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | A pasted job post contains script or markup | Medium | High | Render as text only; links only for http(s); test with hostile payloads |
| R-02 | Rules misread a job post (wrong deadline, type) | High | Medium | "Not stated" / "Check date" instead of guessing; the user can edit every field before saving; original text kept |
| R-03 | localStorage cleared or edited by hand | Medium | Medium | Zod check on load; clear error with reset option; CSV export as a backup |
| R-04 | Malicious post plants a spreadsheet formula | Low | Medium | Neutralise `= + - @` cells on export |
| R-05 | Scope creep back into backend work | High | Medium | Backend ideas go to the `Radar` repo |
