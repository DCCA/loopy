# Implementation Tasks: Flake-Quarantine Loop

**Change ID:** `add-flake-quarantine-loop`

---

## Phase 1: Loop
- [x] 1.1 `hooks/flake.ts` (mergeHistory, scoreHistory, flakyTests, stableTests)
- [x] 1.2 `index.ts` (StateStore-backed; renderFlakeReport; fromManifest)
- [x] 1.3 loop.yaml, playbook, README
- [x] 1.4 Unit tests (scoring + loop + memory StateStore)

## Phase 2: CLI
- [x] 2.1 Catalog entry + `loopy run flake-quarantine` (LOOPY_TEST_RESULTS_FILE + file StateStore)
- [x] 2.2 Package export

**Quality Gate:** typecheck + lint + tests + build

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
