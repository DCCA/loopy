# Proposal: Long-Horizon Runtime Primitives

**Change ID:** `add-long-horizon-runtime`
**Created:** 2026-06-22
**Status:** Implementation Complete
**Completed:** 2026-06-22

---

## Problem Statement

Today's loops are single-shot and stateless. The product-level loops in
[`research/product-level-loops.md`](../../research/product-level-loops.md)
(experiments, incidents, churn, discovery) are **long-horizon, stateful, and
multi-step** with **human-approval checkpoints**. loopy has none of the
primitives to express them. The two biggest gaps: durable state across runs and
resumable multi-step execution with human gates.

## Proposed Solution

Add an additive `src/core/longrun/` module providing the foundational primitives,
without changing the existing single-shot runner:

- **State store** — `StateStore` with in-memory and file-backed implementations;
  durable memory across runs (themes surfaced, accounts contacted, baselines).
- **Approval gate** — a first-class human-approval checkpoint (`require` /
  `decide` / `get`) persisted in the state store.
- **Resumable multi-step plans** — `runPlan(planId, steps, input, store)` that
  executes steps in order, persists progress, and **resumes** from the first
  incomplete step. Steps can return `done`, `waiting` (long-horizon wait-state),
  or `blocked` (awaiting a gate).

These are the substrate the ambitious product loops build on (experiment
orchestrator, churn intervention, incident coordinator).

## Scope

### In Scope
- `src/core/longrun/{state,gate,steps,index}.ts` (additive; new exports)
- Unit tests for state (memory + file), gate idempotency/decisions, and plan
  completion/waiting/blocked/resumption
- Export from `src/core`

### Out of Scope
- Concrete long-horizon loops (separate changes that consume these primitives)
- Non-PR output adapters / external data connectors (separate changes)
- A scheduler daemon — wait-states are evaluated on each (externally scheduled) run

## Impact Analysis

| Component | Change | Details |
|-----------|--------|---------|
| Core | Yes (additive) | new `longrun/` module + exports |
| Existing runner/loops | No | unchanged; single-shot path intact |

## Architecture Considerations

Purely additive: the existing `runLoop` and all current loops are untouched.
`runPlan` is a parallel execution model for stateful loops; a future loop can use
either. Wait-states are re-evaluated on each invocation (the loop is triggered by
the existing scheduler/CI), so no long-running process is required.

## Success Criteria

- [ ] State persists and reloads across runs (memory + file stores); stored values are isolated from caller mutation.
- [ ] Approval gate is idempotent on `require`; `decide` transitions state; unknown id errors.
- [ ] `runPlan` completes a multi-step plan, merging step memory.
- [ ] `runPlan` stops on `waiting`/`blocked` and resumes/completes on a later run.
- [ ] Existing tests still pass (no regression to the single-shot runner).

## Risks & Mitigations

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| State corruption/races | Low | Med | Single-writer per run; clone-on-store; file-per-key |
| Infinite waiting loops | Med | Low | Steps own the wait→done transition; documented contract |
| Scope creep into a scheduler | Med | Med | Wait-states re-evaluated per external run; no daemon |

---

## Archive Information

**Archived:** 2026-06-22
**Outcome:** Successfully implemented (built in parallel via subagents, integrated centrally)
**Verification:** typecheck + lint + 108 tests + build all passing
