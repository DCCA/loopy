# flake-quarantine loop

Tames flaky tests with **stateful, deterministic** pull requests. It accumulates
each test's pass/fail history across runs in a durable `StateStore`, scores
flakiness, and opens a single PR that updates a quarantine manifest
(`quarantine.json`) and a leaderboard report (`reports/flaky-tests.md`). This is
the first loop to use loopy's durable `StateStore` primitive.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | Daily schedule or manual dispatch |
| **detect** | Merge latest runs into stored history, score flakiness, diff against the current quarantine; work needed if any test should be added or removed |
| **act** | Save the merged history, then emit the new `quarantine.json` + regenerated leaderboard |
| **output** | One PR; summary lists quarantined + recovered tests with a masking-risk footer |
| **guardrails** | Allowlist `quarantine.json` + `reports/**`, `maxFiles: 5`, `skipIfOpenPr` |

Fully deterministic (no AI). All external state is injected.

## Deterministic flake scoring

History keeps the last `window` observations per test (de-duplicated by run id).
`flips` counts consecutive status changes; `flakeRate = flips / (observations - 1)`.
A test is **flaky** when it has at least `minObservations`, a `flakeRate` at or
above `flakeThreshold`, and is **not** uniformly failing — an always-red test is
broken, not flaky, and is never quarantined. A test that recovers (enough
observations, zero flips, not all-fail) is **un-quarantined** so the manifest
never grows without bound.

## Stateful history

The merged per-test history is persisted under the key
`flake-quarantine:history` via the injected `StateStore`. `detect` computes the
picture without writing; `act` saves the merged history so the next run scores
over an ever-growing (window-capped) record.

## Configuration (`loop.yaml`)

- `quarantinePath` — quarantine manifest (default `quarantine.json`)
- `reportPath` — leaderboard report (default `reports/flaky-tests.md`)
- `window` — observations retained per test (default `20`)
- `minObservations` — minimum observations before a verdict (default `5`)
- `flakeThreshold` — flake rate that triggers quarantine (default `0.2`)

## Injected boundaries

- `results: TestResultSource` — `recent()` returns the latest test runs.
- `state: StateStore` — durable cross-run history.
- `readQuarantine: () => Promise<string[]>` — the current quarantine list.

## Notes

Quarantining masks real breakage; it is a stopgap, not a fix. The all-fail
exclusion and the recovery (un-quarantine) path are the guardrails against
permanently burying a genuinely broken test. Every PR is meant to be reviewed
before merging.
