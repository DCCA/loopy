# metric-anomaly loop

Turns metric drift into a **readable brief** instead of a pager storm. Watches a
set of metric series, flags the ones whose latest point has drifted from the
series' own baseline (by z-score), and writes a markdown anomaly brief as a
single reviewable pull request — a calm narrator, not an alarm.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | Daily schedule or manual dispatch |
| **detect** | For each series, z-score the latest point against its baseline; work needed if any series crosses `zThreshold` |
| **act** | Render an anomaly brief and emit a single change writing it to `reportPath` |
| **output** | One PR containing the brief; no anomalies ⇒ no work |
| **guardrails** | Allowlist `reports/**`, `maxFiles: 5`, `skipIfOpenPr` |

Fully deterministic (no AI). The metric data is the only external boundary,
injected as `services.metrics` (a `MetricSource`); the clock is injected as
`services.now` for reproducible output.

## Detection (z-score)

For each series with at least 3 points:

- The **baseline** is every point except the last.
- Compute the baseline's **mean** and **population standard deviation**.
- The latest point's `z = (value - mean) / std` when `std > 0`, else `0`.
- It is an anomaly when `std > 0` and `|z| >= zThreshold`; direction is `up`
  when the value is at/above the mean, otherwise `down`.

Series with fewer than 3 points or a flat baseline (`std == 0`) are skipped, so
constant or sparse series never produce false positives. Results are sorted by
`|z|` descending.

## Injected boundaries (`services`)

- `metrics` — a `MetricSource` whose `series()` returns the series to inspect.
  There is no network in the loop; wiring a real data source is the caller's job.
- `now` — `() => Date`, the clock used to date the brief (default `new Date`).

## Configuration (`loop.yaml`)

- `reportPath` — path the anomaly brief is written to (default
  `reports/anomalies.md`)
- `zThreshold` — z-score magnitude at/above which the latest point is anomalous
  (default `3`)

## Anti-pattern warning

Metrics are noisy. A z-score crossing is a **signal to look**, not a verdict — a
single threshold cannot know about deploys, seasonality, or missing data. This
loop deliberately stops at a brief for human review; never wire it to act on its
own findings automatically.
