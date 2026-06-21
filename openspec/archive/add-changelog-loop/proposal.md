# Proposal: Changelog Loop

**Change ID:** `add-changelog-loop`
**Created:** 2026-06-21
**Status:** Implementation Complete
**Completed:** 2026-06-21

---

## Problem Statement

- Changelogs are tedious and routinely skipped, so release history rots.
- The information already exists in commit messages; assembling it is mechanical.

## Proposed Solution

Add `loops/changelog/`: a deterministic loop that collects unreleased commits
(since the last tag), groups them by Conventional Commit type, renders a
changelog entry, and opens a PR prepending it to `CHANGELOG.md`. No AI required;
the grouping is rule-based. Reuses core runner, guardrails, and GitHub adapter.

- **detect** — list unreleased commits via an injectable commit provider; work
  needed if any exist.
- **act** — parse Conventional Commits, group into sections, render an entry,
  prepend to `CHANGELOG.md`.
- **output** — one PR; **guardrails** allowlist `CHANGELOG.md`, `maxFiles: 1`.

## Scope

### In Scope
- Conventional Commit parsing + section grouping (feat/fix/perf/etc.)
- Commit provider interface + a git-backed default; injectable for tests
- Prepend-to-`CHANGELOG.md` output with a sensible header when absent
- Unit tests for parser, renderer, and loop (fake provider)

### Out of Scope
- Version bumping / tag creation / release publishing (separate release loop)
- AI summarization (optional future enhancement)

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Core framework | No | Reuses runner/guardrails |
| Adapters | No | Reuses GitHub adapter |
| Loops catalog | Yes | New `loops/changelog/` |
| Published API | Yes | New loop export |

## Architecture Considerations

A third loop, again reusing the core unchanged, with the commit source as the
only external boundary (injectable provider). Demonstrates a fully deterministic
`act` (no AI), contrasting with auto-docs' AI `act`.

## Success Criteria

- [ ] With unreleased commits, opens one PR updating `CHANGELOG.md`.
- [ ] No unreleased commits produces no PR (fail-safe).
- [ ] Conventional Commits are grouped into the correct sections.
- [ ] Existing `CHANGELOG.md` content is preserved (entry prepended).

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Non-conventional commits | Med | Low | Bucket under "Other" rather than dropping |
| Duplicate entries on re-run | Low | Low | `skipIfOpenPr`; empty once released/tagged |

---

## Archive Information

**Archived:** 2026-06-21
**Outcome:** Successfully implemented
**Specs Updated:** `openspec/specs/changelog-loop.md`
**Files Added:** `loops/changelog/*` (loop.yaml, playbook.md, README.md, hooks/{conventional,commits}.ts, index.ts), `test/loops/changelog.test.ts`
**Verification:** typecheck + lint + 39 tests + build all passing
