# Implementation Tasks: Model-Upgrade Migration Loop

**Change ID:** `add-model-upgrade-migration`
**Status:** Implementation Complete

---

## Phase 1: Loop
- [x] 1.1 `hooks/types.ts` (spec, evaluator boundary, report)
- [x] 1.2 `index.ts` (`modelUpgradeSteps` + `advanceModelUpgrade` on runPlan + Gate)
- [x] 1.3 README + playbook
- [x] 1.4 Unit tests (gate block → approve → bump; regressions + reject → hold)

## Phase 2: Packaging
- [x] 2.1 Package export

**Quality Gate:** typecheck + lint + 174 tests + build — PASSED

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
