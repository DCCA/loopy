# Perf Budget → Narrator Playbook

This loop is **deterministic** — it needs no AI step. It reads measured metrics
from an injected `Measurer`, compares each against a stored baseline, and writes
a markdown report as a single reviewable pull request whenever a metric has
**newly** regressed past its budget.

## Behavior

1. **detect** — call `services.measurer.current()` and `services.readBaseline()`,
   then run `regressions` with `tolerance`. A metric regresses when
   `value > baseline * (1 + tolerance)`. Work is needed only if at least one
   metric regresses. Metrics with no baseline entry are ignored — a brand-new
   metric is not a regression.
2. **act** — render the report (`renderPerfReport`) dated from `services.now`,
   and emit a single change writing it to `reportPath`.
3. **output** — one PR containing the report; no regressions ⇒ no work.

## The boundaries (`services`)

The loop performs no I/O of its own. Both inputs arrive as injected boundaries:

- `measurer` — a `Measurer` whose `current()` returns the metrics measured for
  this build (bundle sizes, benchmark times, …). How those numbers are produced
  (a bundler, a benchmark harness) is the caller's responsibility and lives
  outside the loop.
- `readBaseline` — `() => Promise<Record<string, number>>`, the stored per-metric
  baseline to compare against. Wiring it to a committed baseline file or a
  metrics store is the caller's job.
- `now` — `() => Date`, the clock used to date the report (default `new Date`).

Keeping both as boundaries makes detection pure and testable: a fake measurer, a
fixed baseline, and a fixed `now` make every run reproducible.

## Guardrails

- Allowlist is `reports/**` only; `maxFiles: 5`.
- `skipIfOpenPr` avoids stacking duplicate perf reports.
- Metrics without a baseline are ignored rather than aborting the run, so adding
  a new metric never raises a false alarm.

## Anti-pattern warning

A budget crossing means **investigate**, not **fail the build**. Measurements are
noisy: a cold cache, a noisy CI runner, or a legitimate feature can move a number
without anything being wrong. The `tolerance` margin exists precisely to absorb
that noise — set it too tight and every run cries wolf; set it sensibly and only
real regressions surface. The report is for a human to read: investigate the
regression or deliberately ratchet the baseline. Do **not** wire this loop to
block merges or act on its findings automatically.
