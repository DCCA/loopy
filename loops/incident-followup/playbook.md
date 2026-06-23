# Incident Follow-up Playbook

This loop is **deterministic** — it needs no AI step. It sweeps incident action
items for overdue ones, clusters incidents by root cause to surface recurring
failure patterns, and writes a single markdown follow-up digest as a PR.

## Behavior

1. **detect** — read action items and incidents from the injected
   `IncidentSource`. Compute the overdue action items (`findOverdue`) and the
   recurring root causes (`findRecurrences`). Work is needed when at least one
   overdue item or one recurrence exists.
2. **act** — render the digest (`renderDigest`) and emit a single change set
   writing it to `reportPath`.
3. **output** — one PR containing the refreshed digest.

## What counts

- **Overdue** — an *open* action item whose `dueIso` is strictly before "now".
  `daysOverdue = floor((now - due) / 86400000)`, never negative. Done items and
  items without a due date are excluded. Sorted most-overdue first.
- **Recurrence** — incidents grouped by normalized root cause (lowercased,
  trimmed, whitespace collapsed). A cause with `>= minRecurrence` incidents is a
  recurring failure pattern. Incidents without a root cause are skipped. Sorted
  by count, then cause name.

## Guardrails

- Allowlist is `reports/**`; `maxFiles: 5`.
- `skipIfOpenPr` avoids stacking duplicate digest PRs.
- The clock is injectable (`services.now`) so runs are fully reproducible.

## Anti-pattern: nag fatigue

The digest is a single weekly artifact, not a stream of per-item pings. Surfacing
overdue work and recurring causes together — and only when something is actually
overdue or recurring — keeps the signal high. Re-alerting every item every day
trains people to ignore the loop; this design deliberately avoids that.

## Optional AI enhancement

An AI step could later draft suggested owners or remediation themes for the
recurring causes, but it is intentionally not part of the core deterministic loop.
