# Implementation Tasks: PR Review Loop

**Change ID:** `add-pr-review-loop`
**Status:** Implementation Complete

---

## Phase 1: Output-Channel Extension (Core)

- [x] 1.1 Extend output model with a comment channel (`OutputKind`)
- [x] 1.2 Keep the existing file→PR path unchanged (additive)
- [x] 1.3 Add `postComment` to the GitHub adapter + REST client
- [x] 1.4 Tests for the comment channel

## Phase 2: PR Review Loop

- [x] 2.1 Diff provider boundary (injectable)
- [x] 2.2 AI reviewer boundary (injectable) + playbook.md
- [x] 2.3 `loop.yaml` (event trigger) + loop factory (detect new diff → review)
- [x] 2.4 Tests with mocked diff + reviewer + client

## Phase 3: Integration

- [x] 3.1 Export loop; verify advisory-only behavior
- [x] 3.2 Loop README + example workflow

---

## Completion Checklist

- [x] All phases complete and validated (typecheck + lint + tests + build)
- [x] Ready for `/openspec-archive`
