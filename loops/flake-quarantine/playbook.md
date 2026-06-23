# Flake Quarantine Playbook

This loop is **deterministic** — it needs no AI step. It accumulates test
outcomes across runs in a durable `StateStore`, scores flakiness from that
history, and opens a single PR updating a quarantine manifest plus a leaderboard
report.

## Behavior

1. **detect** — load the per-test run history from state (key
   `flake-quarantine:history`, default `{}`), merge in the latest runs from the
   injected `TestResultSource`, score every test, and compute which tests should
   be newly quarantined (flaky and not already quarantined) or un-quarantined
   (recovered and currently quarantined). Detection persists **nothing**. Work is
   needed only if there is at least one test to add or remove.
2. **act** — recompute the same picture, then **save the merged history** so the
   next run builds on it. Emit two changes: the new `quarantine.json` (a sorted,
   de-duplicated array of quarantined test ids) and the regenerated
   `reports/flaky-tests.md` leaderboard.
3. **output** — one PR; the summary lists what was quarantined and recovered,
   with a footer warning that quarantining masks real breakage.

## Deterministic flake scoring

For each test, history holds its last `window` pass/fail observations
(de-duplicated by run id).

- `flips` = consecutive status changes (pass→fail or fail→pass).
- `flakeRate` = `flips / (observations - 1)` (0 when there is at most one
  observation).
- `allFail` = every observation failed.

A test is **flaky** when `observations >= minObservations`,
`flakeRate >= flakeThreshold`, and it is **not** all-fail — an always-red test is
broken, not flaky, and must not be hidden. A test is **stable/recovered** when it
has enough observations, zero flips, and is not all-fail.

## Guardrails

- Allowlist is `quarantine.json` and `reports/**`; `maxFiles: 5`.
- `skipIfOpenPr` avoids stacking duplicate quarantine PRs.
- Un-quarantine on recovery keeps the manifest from growing forever and forces
  re-validation of fixed tests.

## Anti-pattern warning

Quarantining is a **stopgap**, not a fix. It trades a noisy signal for a quiet
one and can mask a genuine regression. The all-fail exclusion is the guard
against silently burying a fully-broken test; the recovery path is the guard
against permanent quarantine. Every PR must be reviewed before merging.

## Injected boundaries

The loop owns no I/O of its own — everything external is injected via
`FlakeServices`:

- `results: TestResultSource` — supplies recent test runs.
- `state: StateStore` — durable history across runs (the first loop to use it).
- `readQuarantine: () => Promise<string[]>` — the current quarantine list.
