# Implementation Tasks: Test Coverage Backfill Loop

**Change ID:** `add-test-coverage-loop`
**Status:** Implementation Complete

---

## Phase 1: Detection
- [x] 1.1 Coverage-report reader boundary (injectable; lcov/json)
- [x] 1.2 Changed-lines-without-coverage detector
- [x] 1.3 Tests for detector with a fake report

## Phase 2: Loop
- [x] 2.1 AI test-generator boundary + playbook.md
- [x] 2.2 Self-validation gate (run tests; require pass + coverage rise)
- [x] 2.3 `loop.yaml` + loop factory
- [x] 2.4 Tests with fake generator + fake runner

## Phase 3: Integration
- [x] 3.1 Export loop; verify fail-safe (no gap → no PR)
- [x] 3.2 Loop README

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
