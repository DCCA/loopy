# runbook-freshness loop

Flags runbooks whose last review has aged past a **review interval** and writes
a single health report PR. Reads the runbook inventory, computes days since each
runbook was last reviewed, and lists the stale ones — so on-call docs do not
quietly rot.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | Weekly schedule or manual dispatch |
| **detect** | Compute `daysSinceReview` for each runbook; work needed if any exceeds `intervalDays` |
| **act** | Write a markdown health report listing stale runbooks, newest-overdue first |
| **output** | One PR under `reports/` |
| **guardrails** | Allowlist `reports/**`, `maxFiles: 5`, `skipIfOpenPr` |

Fully deterministic (no AI). The runbook inventory is the only external
boundary, injected as `services.source` (a `RunbookSource`).

## Configuration (`loop.yaml`)

- `reportPath` — where the report is written (default `reports/runbook-health.md`)
- `intervalDays` — days since last review before a runbook is stale (default `90`)

## Notes

A runbook is stale when `daysSinceReview > intervalDays`, where
`daysSinceReview = floor((now - lastReviewed) / 86400000)`. Entries with an
unparseable `lastReviewedIso` are skipped rather than aborting the run.

The deliberate antidote to **nag fatigue**: the loop reports only what is
actually past the interval, as a single report, instead of pinging every
runbook on every run. Tune `intervalDays` so reviews are meaningful rather than
busywork.
