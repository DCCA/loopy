# Proposal: Model-Upgrade Migration Loop

**Change ID:** `add-model-upgrade-migration`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Problem Statement

Switching to a new model version risks silent behavior regressions. A gated
migration that diffs a golden set across the current and candidate models before
the switch makes it safe. Ranked #7 in the deep dive; a `runPlan` showcase.

## Proposed Solution

Add `loops/model-upgrade-migration/`: a resumable plan
`baseline → candidate → diff → approve (gate) → apply` that evaluates a golden set
on both models, computes regressions + score delta, and proposes the model-id
bump only after human approval. Reuses the prompt-eval `Scorecard`/`regressions`
and the `longrun` primitives (runPlan + Gate + StateStore).

## Scope

### In Scope
- `loops/model-upgrade-migration/` (hooks/types.ts, index.ts, README, playbook)
- `advanceModelUpgrade` on runPlan; injected `evaluate(modelId)` boundary
- Unit tests (gate block → approve → bump; regressions + rejection → hold)
- Package export

### Out of Scope
- A PR adapter / CLI verb to open the bump (programmatic for now, like experiment)
- Running the eval itself (injected evaluator)

## Success Criteria

- [x] Evaluates both models, diffs regressions + delta, blocks at the approval gate.
- [x] On approval → emits the model-id bump change set; resumes from the gate.
- [x] On rejection → holds (no bump).
- [x] Surfaces regressions in the plan memory.

## Risks & Mitigations

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Silent regression on switch | Med | High | Golden-set diff + human gate before bump |
| Moving-target candidate | Low | Med | Pin candidate model id; fixed golden set |
| Eval cost | Med | Low | Cap golden-set size (consumer) |

---

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 174 tests + build all passing
