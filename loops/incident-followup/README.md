# incident-followup loop

Keeps postmortems honest. Sweeps incident **action items** for overdue ones and
clusters incidents by **root cause** to surface recurring failure patterns, then
publishes a single markdown follow-up digest as a pull request.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | Weekly schedule or manual dispatch |
| **detect** | Compute overdue action items and recurring root causes; work needed if either is non-empty |
| **act** | Render the digest and emit it as one change set under `reports/**` |
| **output** | One PR refreshing `reports/incident-followup.md` |
| **guardrails** | Allowlist `reports/**`, `maxFiles: 5`, `skipIfOpenPr` |

Fully deterministic (no AI). The incident data is the only external boundary,
injected as `services.incidents`.

## Injected boundaries (`services`)

- `incidents` — an `IncidentSource` exposing `incidents()` and `actionItems()`;
  the loop performs no network I/O of its own
- `now` — optional `() => Date` clock for reproducible runs (default `new Date`)

## What counts

- **Overdue** — an *open* action item whose `dueIso` is strictly before "now".
  `daysOverdue` is whole days, clamped at 0; done and dateless items are excluded.
- **Recurrence** — a normalized root cause shared by `>= minRecurrence`
  incidents. Incidents without a root cause are skipped.

## Configuration (`loop.yaml`)

- `reportPath` — where the digest is written (default `reports/incident-followup.md`)
- `minRecurrence` — incidents sharing a cause before it counts as recurring
  (default `2`)

## Notes

The digest is one weekly artifact rather than a stream of per-item nags — the
deliberate antidote to alert fatigue. The loop produces no PR when nothing is
overdue and no cause recurs, and every change is gated by the `reports/**`
allowlist.
