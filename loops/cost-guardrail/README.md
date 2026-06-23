# cost-guardrail loop

Flags cloud resources that have been **idle for K consecutive observations** and
proposes a **human-gated** remediation report. It tracks an idle streak per
resource in a durable `StateStore`, and it **never auto-deletes** anything — the
report PR is the remediation proposal, and it is only produced after a human
approves the gate.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | Daily schedule (`0 7 * * *`) |
| **detect** | Advance idle streaks from the usage snapshot; work needed if any resource has been idle for `minStreak` observations |
| **act** | Persist the advanced streaks, then gate remediation: comment while pending/rejected, one PR once approved |
| **output** | A comment while gated, or one PR writing `reports/cost-guardrail.md` |
| **guardrails** | Allowlist `reports/**`, `maxFiles: 5`, `skipIfOpenPr` |

Fully deterministic (no AI). The usage feed is the only external boundary,
injected as `services.usage` (a `UsageSource`).

## Configuration (`loop.yaml`)

- `reportPath` — where the remediation report is written (default
  `reports/cost-guardrail.md`)
- `idleThreshold` — utilization at or below which a resource is idle, in `[0, 1]`
  (default `0.05`)
- `minStreak` — consecutive idle observations before a resource is flagged
  (default `3`)

## Notes

The streak counters always advance, even on a gated or no-op run, so the grace
period progresses honestly across runs. Approval is recorded via the
`cost-guardrail:remediate` gate (`createGate(state).decide(...)`); nothing is
ever deleted automatically. See `playbook.md` for the anti-pattern rationale.
