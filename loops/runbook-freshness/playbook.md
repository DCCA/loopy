# Runbook Freshness Playbook

This loop is **deterministic** — it needs no AI step. It reads the runbook
inventory, computes how long each runbook has gone without review, and writes a
single health report listing the ones past the review interval.

## Behavior

1. **detect** — read runbooks from `services.source`, compute
   `daysSinceReview = floor((now - lastReviewed) / 86400000)` for each, and flag
   any where `daysSinceReview > intervalDays`. Work is needed only if at least
   one runbook is stale.
2. **act** — write a markdown report to `reportPath` listing the stale runbooks,
   sorted by `daysSinceReview` descending, and emit a single change set.
3. **output** — one PR under `reports/`.

## The interval

`intervalDays` (default `90`) is the maximum age a runbook's review may reach
before it is flagged. Runbooks reviewed within the interval are silent. Entries
with an unparseable `lastReviewedIso` are skipped, never aborting the run.

## Boundary

The runbook inventory is injected as `services.source`, a `RunbookSource` whose
`runbooks()` returns `{ path, lastReviewedIso }[]`. The clock is injected as
`services.now` for deterministic runs. Both keep the loop pure and testable.

## Anti-pattern: nag fatigue

Do not flag every runbook on every run, and do not open a PR per runbook. A wall
of reminders trains reviewers to ignore the loop. This loop reports only what is
genuinely past the interval, as one consolidated report. Tune `intervalDays` so
each flag is a real signal worth a review and a fresh `lastReviewed` stamp.

## Optional AI enhancement

An AI step could later summarize what changed in a service since a runbook's last
review to prioritize which stale runbooks matter most, but it is intentionally
not part of the core deterministic loop.
