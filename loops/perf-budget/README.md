# perf-budget loop

Keeps performance metrics within budget by turning regressions into a **readable
report** instead of a red build. Measures metrics (bundle size, benchmark times),
compares each to a stored baseline, and writes a markdown report as a single
reviewable pull request — flagging only metrics that have **newly** regressed.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | A `pull_request` event |
| **detect** | Compare each measured metric to its baseline; work needed if any value exceeds `baseline * (1 + tolerance)` |
| **act** | Render a perf report and emit a single change writing it to `reportPath` |
| **output** | One PR containing the report; no regressions ⇒ no work |
| **guardrails** | Allowlist `reports/**`, `maxFiles: 5`, `skipIfOpenPr` |

Fully deterministic (no AI). The measurements and the baseline are the only
external boundaries, injected as `services.measurer` (a `Measurer`) and
`services.readBaseline`; the clock is injected as `services.now` for reproducible
output.

## Detection (budget)

For each measured metric that has a baseline entry:

- It is a **regression** when `value > baseline * (1 + tolerance)`.
- `pct = round((value - baseline) / baseline * 100)`.

Metrics **without** a baseline are ignored — a brand-new metric is never a
regression. Results are sorted by `pct` descending. Only new regressions surface;
a metric already over baseline that hasn't gotten worse is judged against the
stored baseline, so the loop reports it each run until the baseline is ratcheted.

## Injected boundaries (`services`)

- `measurer` — a `Measurer` whose `current()` returns the metrics measured for
  this build. There is no measurement I/O in the loop; producing the numbers is
  the caller's job.
- `readBaseline` — `() => Promise<Record<string, number>>` returning the stored
  baseline to compare against.
- `now` — `() => Date`, the clock used to date the report (default `new Date`).

## Configuration (`loop.yaml`)

- `reportPath` — path the report is written to (default `reports/perf.md`)
- `tolerance` — fractional margin a value may exceed its baseline before it
  regresses (default `0.1`, i.e. 10%)

## Anti-pattern warning

Measurements are noisy. A budget crossing is a **signal to investigate**, not a
verdict — a cold cache or a noisy runner can move a number without a real
regression. The `tolerance` margin absorbs that noise; set it too tight and every
run cries wolf. This loop deliberately stops at a report for human review:
investigate the regression or ratchet the baseline. Never wire it to block merges
automatically.
