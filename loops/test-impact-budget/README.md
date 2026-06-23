# test-impact-budget loop

Tracks **per-test runtime** against a rolling baseline and flags tests whose
duration grew beyond a threshold. Reads the latest timings from an injected
`TimingSource`, compares each to an EWMA baseline stored in the `StateStore`, and
opens a single PR with a report of the regressions. Fully deterministic.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | Weekly schedule (Mondays) or manual dispatch |
| **detect** | Load baseline from state; compute regressions for the latest timings; work needed if any test regressed |
| **act** | Recompute against the OLD baseline, save the EWMA-rolled baseline, write the report |
| **output** | One PR; regressed tests listed with duration, baseline, and growth % |
| **guardrails** | Allowlist `reports/**`, `maxFiles: 5`, `skipIfOpenPr` |

Timings are the only external boundary, injected as `services.timings`; the EWMA
baseline persists across runs in `services.state` under the key
`test-impact:baseline`.

## Configuration (`loop.yaml`)

- `reportPath` — report destination (default `reports/test-impact.md`)
- `growthThreshold` — fractional growth over baseline before a test regresses
  (default `0.5`)
- `alpha` — EWMA smoothing factor that rolls the baseline forward (default `0.3`)

## Notes

A first-seen test only seeds the baseline; it is never a regression. Regressions
are computed against the OLD baseline, then the baseline is rolled forward — see
`playbook.md` for the EWMA math and the noise anti-pattern.
