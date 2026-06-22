# Implementation Tasks: PR Review Runtime

**Change ID:** `add-pr-review-runtime`

---

## Phase 1: Diff provider
- [x] 1.1 `createGitHubDiffProvider` (REST list PR files, injectable fetch)
- [x] 1.2 Export from the GitHub adapter
- [x] 1.3 Tests with a fake fetch

## Phase 2: Wire-up
- [x] 2.1 PR-number resolution (`LOOPY_PR_NUMBER` / `GITHUB_REF`)
- [x] 2.2 `loopy run pr-review` builds diff + reviewer and posts the comment
- [x] 2.3 Template wires `LOOPY_PR_NUMBER` for event loops
- [x] 2.4 Tests (run dispatch via injected fakes; missing-number guidance; scaffold)

**Quality Gate:** typecheck + lint + tests + build

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
