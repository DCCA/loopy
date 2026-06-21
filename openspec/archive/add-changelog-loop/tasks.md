# Implementation Tasks: Changelog Loop

**Change ID:** `add-changelog-loop`

---

## Phase 1: Parsing & Rendering

- [x] 1.1 Implement Conventional Commit parser
- [x] 1.2 Implement section grouping + changelog entry renderer
- [x] 1.3 Unit tests for parser + renderer

**Quality Gate:** typecheck + lint + tests

---

## Phase 2: Loop & Provider

- [x] 2.1 Define commit provider interface + git-backed default
- [x] 2.2 Create `loops/changelog/loop.yaml`
- [x] 2.3 Implement loop factory (detect + act prepending to CHANGELOG.md)
- [x] 2.4 `playbook.md` documenting behavior
- [x] 2.5 Unit tests for detect/act (commits present, none, CHANGELOG absent)

**Quality Gate:** present + empty cases pass

---

## Phase 3: Integration

- [x] 3.1 Export the loop; verify via shared runner + GitHub adapter
- [x] 3.2 Loop README

**Quality Gate:** full typecheck + lint + tests + build

---

## Completion Checklist

- [x] All phases complete
- [x] Success criteria verified
- [x] Ready for `/openspec-archive`
