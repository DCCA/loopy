# Proposal: Release-Train Loop

**Change ID:** `add-release-train-loop`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Problem Statement

Cutting releases by hand (version bump + changelog) is tedious and error-prone.
The information is already in conventional commits. This loop also **dogfoods
loopy** — it can automate loopy's own releases.

## Proposed Solution

Add `loops/release-train/`: from unreleased conventional commits, compute the
next semver bump (breaking→major, feat→minor, else patch), and open a Release PR
updating `package.json` `version` and prepending a `CHANGELOG.md` entry. Merging
the PR cuts the release. Fully deterministic; commit source + current version are
injected boundaries.

## Scope

### In Scope
- `loops/release-train/` (hooks/release.ts, index.ts, loop.yaml, playbook, README)
- Reuse the existing conventional-commit parser
- Catalog entry + `loopy run release-train` (git-backed source)
- Unit tests

### Out of Scope
- Tag/GitHub-release creation on merge (follow-up)
- Continuously updating an already-open Release PR in place (skip-if-open for v1)

## Success Criteria

- [ ] feat → minor, fix → patch, breaking → major; no releasable commits → no PR.
- [ ] Release PR bumps `package.json` version and prepends a changelog entry.
- [ ] Deterministic and idempotent against the current version.

## Risks & Mitigations

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Double bump | Low | Med | Bump computed from current version; skip-if-open |
| Wrong bump | Low | Med | Conventional-commit rules; human merges the PR |

---

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 161 tests + build; release-train dogfooded on loopy's own repo (dry-run)
