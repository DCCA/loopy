# Implementation Tasks: Prompt-Eval Gate Loop

**Change ID:** `add-prompt-eval-gate`
**Status:** Implementation Complete

---

## Phase 1: Loop
- [x] 1.1 `hooks/eval.ts` (grade, runEval, regressions, renderScorecard)
- [x] 1.2 `index.ts` (baseline in StateStore + promotion Gate; comment/PR output)
- [x] 1.3 loop.yaml, playbook, README
- [x] 1.4 Unit tests (establish / regress / gated promote / stable)

## Phase 2: CLI
- [x] 2.1 Catalog entry + `loopy run prompt-eval-gate` (AI model + LOOPY_EVAL_CASES_FILE + file state)
- [x] 2.2 Resolve PR number for event-triggered loops; package export

**Quality Gate:** typecheck + lint + 172 tests + build — PASSED

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
