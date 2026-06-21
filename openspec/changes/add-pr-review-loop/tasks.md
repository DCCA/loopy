# Implementation Tasks: PR Review Loop

**Change ID:** `add-pr-review-loop`
**Status:** Planned (not yet started)

---

## Phase 1: Output-Channel Extension (Core)

- [ ] 1.1 Extend output model with a comment channel (`OutputKind`)
- [ ] 1.2 Keep the existing file→PR path unchanged (additive)
- [ ] 1.3 Add `postComment` to the GitHub adapter + REST client
- [ ] 1.4 Tests for the comment channel

## Phase 2: PR Review Loop

- [ ] 2.1 Diff provider boundary (injectable)
- [ ] 2.2 AI reviewer boundary (injectable) + playbook.md
- [ ] 2.3 `loop.yaml` (event trigger) + loop factory (detect new diff → review)
- [ ] 2.4 Tests with mocked diff + reviewer + client

## Phase 3: Integration

- [ ] 3.1 Export loop; verify advisory-only behavior
- [ ] 3.2 Loop README + example workflow

---

## Completion Checklist

- [ ] All phases complete and validated (typecheck + lint + tests + build)
- [ ] Ready for `/openspec-archive`
