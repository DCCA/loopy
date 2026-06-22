# Proposal: Experiment Lifecycle Orchestrator

**Change ID:** `add-experiment-orchestrator`
**Created:** 2026-06-22
**Status:** Implementation Complete
**Completed:** 2026-06-22

---

## Problem Statement

The `longrun` primitives (durable state, approval gates, resumable plans) shipped
with no loop consuming them. The Experiment Lifecycle Orchestrator — the
top-differentiation product-level loop from the research — is the flagship that
exercises all of them and proves the long-horizon model end-to-end.

## Proposed Solution

Add `loops/experiment/`: a resumable plan that drives an experiment
`design → approve-design (gate) → launch → bake (wait) → readout → decide (gate)`
via `runPlan`, persisting progress in a `StateStore` and pausing at human gates
and the long-horizon bake. Boundaries are injected: an AI **designer**
(`createExperimentDesigner` over the OpenRouter provider) and an
**ExperimentPlatform** (`launch` + `results`). Advanced by calling
`advanceExperiment(...)` repeatedly; resumes from the last pause; no-op once
complete. A rejected design short-circuits without launching.

## Scope

### In Scope
- `loops/experiment/` (types, plan/steps, `advanceExperiment`, readout, README, playbook)
- `createExperimentDesigner` AI adapter
- Full-lifecycle unit tests (gates, bake wait, completion, rejection) with fakes + memory store

### Out of Scope
- A CLI verb to advance plans on a schedule (`loopy advance`) — follow-up (needs a persistent state location + hypothesis registry)
- Concrete platform connectors (Statsig/Eppo/GrowthBook) — injected boundary
- Auto-ship (decision is always human-gated)

## Impact Analysis

| Component | Change | Details |
|-----------|--------|---------|
| Core | No | consumes `longrun` as-is |
| Loops | Yes | new `loops/experiment/` (plan-based, not single-shot) |
| AI provider | Yes | `createExperimentDesigner` |

## Success Criteria

- [x] Blocks at the design gate; resumes on approval.
- [x] Waits during bake; completes the bake step once results land.
- [x] Blocks at the decision gate; completes with the recommended decision on approval.
- [x] Rejected design short-circuits to `finalDecision: "rejected"` without launching.
- [x] State + progress persist and resume across separate `advanceExperiment` calls.

## Risks & Mitigations

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Acting on noisy/early results | Med | High | Bake completes only when platform reports results; decision is human-gated |
| Runaway auto-ship | Low | High | No auto-ship — explicit decision gate |
| Stuck plans | Low | Med | Steps own wait→done; resumable; rejection short-circuit |

---

## Archive Information

**Archived:** 2026-06-22
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 111 tests + build all passing
