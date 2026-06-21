# Proposal: CI Workflow

**Change ID:** `add-ci-workflow`
**Created:** 2026-06-21
**Status:** Implementation Complete
**Completed:** 2026-06-21

---

## Problem Statement

loopy ships only an *example* workflow; there is no CI running the quality gate
on pull requests. Regressions in typecheck, lint, tests, or build could merge
unnoticed.

## Proposed Solution

Add `.github/workflows/ci.yml` running `npm ci` then `typecheck`, `lint`,
`test`, and `build` on pushes to `main` and on every pull request. Dogfoods the
same gate used locally.

## Scope

### In Scope
- A single CI workflow running the existing npm scripts on Node 20

### Out of Scope
- Release/publish automation; matrix across Node versions (later)

## Success Criteria

- [ ] CI runs on PRs and on push to `main`.
- [ ] It fails if typecheck, lint, tests, or build fail.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Flaky/slow CI | Low | Low | Cache npm; run the same fast scripts as local |

---

## Archive Information

**Archived:** 2026-06-21
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 64 tests + build all passing
