# Proposal: PR Review Runtime (turnkey)

**Change ID:** `add-pr-review-runtime`
**Created:** 2026-06-21
**Status:** Implementation Complete
**Completed:** 2026-06-21

---

## Problem Statement

`pr-review` has an AI reviewer adapter but `loopy run pr-review` still reports
guidance because its non-AI boundary — the **PR diff** — isn't wired. It can't
run from the scaffolded workflow yet.

## Proposed Solution

Add a GitHub PR **diff provider** (REST: list PR files with patches) and wire
`loopy run pr-review` to build the loop with it plus the AI reviewer, resolving
the target PR number from the environment, and posting the advisory comment.

- **Diff provider:** `createGitHubDiffProvider({ owner, repo, token, prNumber })`
  → `getDiff()` via `GET /repos/{o}/{r}/pulls/{n}/files`.
- **PR number:** from `LOOPY_PR_NUMBER` or `GITHUB_REF` (`refs/pull/<n>/merge`).
- **Scaffold:** event-triggered loops also wire
  `LOOPY_PR_NUMBER: ${{ github.event.pull_request.number }}`.

## Scope

### In Scope
- `createGitHubDiffProvider` (injectable fetch)
- Wire `loopy run pr-review` (diff + AI reviewer + PR number → comment)
- Template: `LOOPY_PR_NUMBER` for event loops
- Tests (diff provider via fake fetch; run dispatch via injected fakes)

### Out of Scope
- `test-coverage` turnkey (needs coverage reader + test runner — separate change)
- Diff pagination beyond the first 100 files (follow-up)
- Inline per-line comments

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Adapter | Yes | New diff provider |
| CLI `run` | Yes | pr-review branch + PR-number resolution |
| Template | Yes | `LOOPY_PR_NUMBER` for event loops |

## Success Criteria

- [ ] `loopy run pr-review` posts an advisory comment given an AI key + PR number.
- [ ] Missing PR number / AI key → clear guidance, not an opaque failure.
- [ ] The diff provider maps PR files to `{ path, patch }`.
- [ ] `loopy add pr-review` scaffolds `LOOPY_PR_NUMBER`.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Large PRs exceed one page | Med | Low | Document; paginate in a follow-up |
| Missing PR-number env | Med | Low | Resolve from `GITHUB_REF`; clear guidance otherwise |

---

## Archive Information

**Archived:** 2026-06-21
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 79 tests + build all passing
