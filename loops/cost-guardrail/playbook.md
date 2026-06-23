# Cost Guardrail Playbook

This loop is **deterministic** — it needs no AI step. It accumulates per-resource
idle observations across runs in a durable `StateStore`, and once a resource has
been idle for long enough it proposes a **human-gated** remediation report. It
**never deletes anything** on its own.

## Behavior

1. **detect** — load the per-resource idle streaks from state (key
   `cost-guardrail:streaks`, default `{}`), pull the current usage snapshot from
   the injected `UsageSource`, advance the streaks for this observation, and
   compute which resources have reached `minStreak` consecutive idle
   observations. Detection persists **nothing**. Work is needed only if at least
   one resource is idle past the threshold.
2. **act** — recompute the same picture and **save the advanced streaks** so the
   next run builds on them — this happens on *every* run, even a gated or no-op
   one, so the grace period is honest. If nothing is idle past threshold, return
   no changes. Otherwise `require` the `cost-guardrail:remediate` gate:
   - **pending** → a blocking comment listing the idle resources and asking a
     human to approve before any remediation is proposed;
   - **rejected** → a comment noting the rejection; the resources are left
     untouched;
   - **approved** → a single PR writing the remediation report to `reportPath`.
3. **output** — a comment while gated/rejected, or one PR (the remediation
   **proposal**) once approved.

## Idle-streak scoring

Each observation updates the streak per resource:

- utilization `<= idleThreshold` → `streak = previous + 1`;
- utilization above the threshold → `streak = 0` (any real use clears it);
- resources absent from the snapshot are dropped.

A resource is **flagged** once `streak >= minStreak`. Flagged resources are
sorted by monthly cost, descending, so the most expensive waste surfaces first.

## Guardrails

- Allowlist is `reports/**` only; `maxFiles: 5`.
- `skipIfOpenPr` avoids stacking duplicate remediation PRs.
- The gate (`cost-guardrail:remediate`) is the hard stop: no report PR exists
  until a human approves.

## Anti-pattern warnings

- **Never auto-delete.** Cost tooling that deletes resources on a heuristic will
  eventually delete something load-bearing. This loop only ever *proposes* — the
  report PR is the remediation artifact, and even that requires gate approval.
- **Grace via streak, not a single sample.** A resource that looks idle in one
  reading may be batch-driven, on-call standby, or simply between bursts.
  Requiring `minStreak` consecutive idle observations is the deliberate grace
  period; a single busy reading resets the counter to zero.

## Injected boundaries

The loop owns no I/O of its own — everything external is injected via
`CostServices`:

- `usage: UsageSource` — supplies the current resource usage snapshot.
- `state: StateStore` — durable idle streaks and gate state across runs.
