# Manual Test Scenarios — Fictional Vocabulary Agent Demo

These are demonstration checks, **not** evidence that real Gmail/Notion/Drive integration passed UAT.

| ID | Action | Expected result |
|---|---|---|
| VA-T01 | Open `index.html` | Three fictional source options are shown |
| VA-T02 | Select `Meeting Notes` then Extract | Four predefined terms are displayed |
| VA-T03 | Click Add to local library | Four sample records are added locally |
| VA-T04 | Click Add to local library again | Duplicates are skipped, total stays four |
| VA-T05 | Select `BA Study Notes`, extract and add | Five new records are added |
| VA-T06 | Click one saved term | Definition, example and source display |
| VA-T07 | Click Preview Friday summary | Sample email lists the current local terms |
| VA-T08 | Reload the browser | Where local storage works, saved sample records remain |
| VA-T09 | Click Reset demo | Local records and preview are cleared |
| VA-T10 | Inspect demo wording | No action claims to send Gmail or update Notion |

## Real integration tests to design separately

OAuth scopes and permissions; Notion duplicate search; multiword detection from real images; unsuccessful write handling; notification retries; clickable actual links; weekly date-window boundaries and timezone; idempotency on a rerun.
