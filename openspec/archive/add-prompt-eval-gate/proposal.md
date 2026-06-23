# Proposal: Prompt-Eval Gate Loop

**Change ID:** `add-prompt-eval-gate`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Problem Statement

Prompt/model changes can silently regress quality. An LLMOps regression gate that
scores an eval set against a stored baseline catches it. Ranked #4 in the deep
dive; loopy dogfoods it on its own AI loops' prompts.

## Proposed Solution

Add `loops/prompt-eval-gate/`: run an eval set through the model, grade
deterministically, and compare to a baseline in the durable `StateStore`. No
baseline → establish; regressions → blocking advisory comment (baseline
unchanged); improvement → human-`Gate`d baseline promotion (comment until
approved, then a PR writing the baseline file). Reuses the AI client + comment
output channel.

## Scope

### In Scope
- `loops/prompt-eval-gate/` (hooks/eval.ts, index.ts, loop.yaml, playbook, README)
- StateStore baseline + promotion Gate; deterministic grading
- Catalog entry + `loopy run prompt-eval-gate` (model = AI client, cases from `LOOPY_EVAL_CASES_FILE`, file state)
- Unit tests + package export

### Out of Scope
- Rubric/LLM-judged grading (deterministic substring grading for v1)
- Per-category risk scorecards (future)

## Success Criteria

- [x] No baseline → establishes one (comment) and persists it.
- [x] Regression → blocking comment; baseline not moved.
- [x] Improvement → gated; on approval, a PR writes `evals/baseline.json` + state updated.
- [x] Stable within tolerance → no work.

## Risks & Mitigations

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Flaky LLM grading | Med | Med | Deterministic substring grading + tolerance |
| Silent baseline drift | Low | High | Promotion is human-gated; regressions never move it |

---

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 172 tests + build all passing
