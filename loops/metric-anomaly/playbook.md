# Metric Anomaly → Narrator Playbook

This loop is **deterministic** — it needs no AI step. It reads metric series from
an injected `MetricSource`, z-scores each series' latest point against its own
baseline, and writes a markdown anomaly brief as a single reviewable pull
request.

## Behavior

1. **detect** — call `services.metrics.series()` and run `detectAnomalies` with
   `zThreshold`. Work is needed only if at least one series crosses the
   threshold. For each series with `>= 3` points, the baseline is all points
   except the last; the latest point's z-score is `(value - mean) / std` over
   the baseline (population std). It is an anomaly when `std > 0` and
   `|z| >= zThreshold`.
2. **act** — render the anomaly brief (`renderAnomalyBrief`) dated from
   `services.now`, and emit a single change writing it to `reportPath`.
3. **output** — one PR containing the brief; no anomalies ⇒ no work.

## The MetricSource boundary

The loop performs no I/O of its own. All metric data arrives through
`services.metrics`, a `MetricSource` with a single `series()` method. This keeps
detection pure and testable: a fake source plus a fixed `now` makes every run
reproducible. Wiring `series()` to a real metrics backend is the caller's
responsibility and lives outside the loop.

## Guardrails

- Allowlist is `reports/**` only; `maxFiles: 5`.
- `skipIfOpenPr` avoids stacking duplicate anomaly briefs.
- Series with fewer than 3 points or a flat baseline (`std == 0`) are skipped,
  never aborting the run — constant or sparse series cannot raise false alarms.

## Anti-pattern warning

A z-score crossing means **look here**, not **this is broken**. Metrics are
noisy: deploys, seasonality, and missing data all move a series without anything
being wrong. The brief exists for a human to read and judge. Do **not** layer on
an AI or automation step that *acts* on these findings; the deliberate end state
of this loop is a reviewable narrative, nothing more.
