# Implementation Tasks: Test Coverage Backfill Loop

**Change ID:** `add-test-coverage-loop`
**Status:** Planned (not yet started)

---

## Phase 1: Detection
- [ ] 1.1 Coverage-report reader boundary (injectable; lcov/json)
- [ ] 1.2 Changed-lines-without-coverage detector
- [ ] 1.3 Tests for detector with a fake report

## Phase 2: Loop
- [ ] 2.1 AI test-generator boundary + playbook.md
- [ ] 2.2 Self-validation gate (run tests; require pass + coverage rise)
- [ ] 2.3 `loop.yaml` + loop factory
- [ ] 2.4 Tests with fake generator + fake runner

## Phase 3: Integration
- [ ] 3.1 Export loop; verify fail-safe (no gap → no PR)
- [ ] 3.2 Loop README

---

## Completion Checklist
- [ ] All phases complete and validated
- [ ] Ready for `/openspec-archive`
