# Test Impact Budget Playbook

This loop is **deterministic** — it needs no AI step. It accumulates per-test
runtimes across runs in a durable `StateStore`, compares each test's latest
duration to an exponentially weighted moving-average (EWMA) baseline, and opens a
single PR with a report of the tests that grew past their budget.

## Behavior

1. **detect** — load the per-test baseline from state (key
   `test-impact:baseline`, default `{}`), read the latest timings from the
   injected `TimingSource`, and compute regressions against the OLD baseline.
   Detection persists **nothing**. Work is needed only if at least one test
   regressed.
2. **act** — recompute regressions against the OLD baseline, then **save the
   rolled-forward baseline** (`updateBaseline`, EWMA per test) so the next run
   builds on it. Emit one change: the regenerated `reports/test-impact.md`.
3. **output** — one PR; the summary lists the regressed tests with their
   duration, baseline, and growth percentage.

## EWMA rolling baseline

The baseline is kept in the `StateStore` as `testId → baseline ms`.

- A **regression** is a test whose latest `durationMs > baselineMs * (1 + growthThreshold)`;
  its growth `pct = round((durationMs - baselineMs) / baselineMs * 100)`.
- First-seen tests (no baseline yet) are **never** regressions — they only seed
  the baseline.
- The baseline rolls forward with an EWMA: `new = round(alpha * durationMs + (1 - alpha) * baselineMs)`.
  A higher `alpha` tracks recent runs more aggressively; a lower `alpha` smooths
  over noise. Existing baselines with no matching latest timing are carried over
  unchanged.

Regressions are always computed against the OLD baseline within a single run;
the baseline is only advanced *after* the comparison, so a slow run is flagged
once before being absorbed into the new baseline.

## The injected boundary

The loop owns no I/O of its own — everything external is injected via
`TestImpactServices`:

- `timings: TimingSource` — supplies the latest per-test durations. Timings are
  the only boundary, kept injectable so the loop is fully deterministic.
- `state: StateStore` — durable EWMA baseline across runs.

## Guardrails

- Allowlist is `reports/**`; `maxFiles: 5`.
- `skipIfOpenPr` avoids stacking duplicate report PRs.

## The noise anti-pattern

Test timings are inherently noisy — CI contention, cold caches, and machine
variance all jitter a single run. Flagging on a raw run-over-run delta produces
a flood of false positives and the report gets ignored. The EWMA baseline plus a
deliberate `growthThreshold` is the antidote: the baseline absorbs ordinary
jitter, and only a sustained, meaningful slowdown crosses the threshold. Tune
`alpha` and `growthThreshold` together — too eager and you re-introduce the
noise you were trying to suppress.
