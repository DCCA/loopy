# Implementation Tasks: Experiment Lifecycle Orchestrator

**Change ID:** `add-experiment-orchestrator`
**Status:** Implementation Complete

---

## Phase 1: Orchestrator
- [x] 1.1 Types/boundaries (`hooks/types.ts`: Hypothesis, Design, Results, Designer, Platform)
- [x] 1.2 Plan steps + `advanceExperiment` over `runPlan` + gates + state
- [x] 1.3 Readout renderer
- [x] 1.4 README + playbook

## Phase 2: AI + tests
- [x] 2.1 `createExperimentDesigner` AI adapter
- [x] 2.2 Full-lifecycle tests (gates, bake wait, completion, rejection)
- [x] 2.3 Package export

**Quality Gate:** typecheck + lint + 111 tests + build — PASSED

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
