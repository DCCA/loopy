# Proposal: Dependency Updates Loop

**Change ID:** `add-dependency-updates-loop`
**Created:** 2026-06-21
**Status:** Implementation Complete
**Completed:** 2026-06-21

---

## Problem Statement

- Dependencies fall behind, accruing bugs and security exposure.
- Naive update bots produce overwhelming PR noise — research shows only ~32% of
  ungrouped Dependabot PRs merge, the #1 automation failure mode.
- Teams need updates that are **batched, low-risk, and reviewable**.

## Proposed Solution

Add `loops/dep-updates/`: a deterministic loop that reads the package manifest,
compares each dependency against the registry's latest version, and opens a
**single grouped PR** bumping the safe (non-major) updates. Major updates are
detected and reported but not applied by default (fights fatigue, keeps risk
low). Reuses the core runner, guardrails, and GitHub adapter.

- **detect** — read `package.json`, query the registry for latest versions,
  compute pending updates; work needed if any applicable update exists.
- **act** — bump version ranges in `package.json` (preserving `^`/`~` prefixes)
  for non-major updates; emit one change set.
- **output** — one PR; **guardrails** allowlist `package.json` only.

## Scope

### In Scope
- npm `package.json` (`dependencies` + `devDependencies`) range bumps
- Registry client (injectable `fetch`) + minimal semver compare
- Grouped single-PR output; major updates excluded unless `allowMajor: true`
- Unit tests with a fake registry

### Out of Scope
- Lockfile regeneration (consumer CI runs `npm install`)
- Non-npm ecosystems; automerge-on-green (follow-up)
- Per-dependency separate PRs

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Core framework | No | Reuses runner/guardrails as-is |
| Adapters | No | Reuses GitHub adapter PR publishing |
| Loops catalog | Yes | New `loops/dep-updates/` |
| Published API | Yes | New loop export |

## Architecture Considerations

Confirms the framework generalizes beyond auto-docs: a second loop reuses the
runner, guardrails, manifest pattern, and PR publishing unchanged. The registry
is the only external boundary, isolated behind an injectable client.

## Success Criteria

- [ ] With outdated non-major deps, opens one PR bumping their ranges.
- [ ] Up-to-date manifest produces no PR (idempotent / fail-safe).
- [ ] Major updates are excluded by default and surfaced in the PR summary.
- [ ] `^`/`~` range prefixes are preserved on bump.
- [ ] Registry boundary covered by tests with an injected fetch.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PR fatigue | Med | Med | Group into one PR; exclude majors by default |
| Breaking bump | Low | High | Non-major only by default; PR review; CI gate |
| Registry/network failure | Low | Low | Fail safe (skip dep on error, no partial PR) |

---

## Archive Information

**Archived:** 2026-06-21
**Outcome:** Successfully implemented
**Specs Updated:** `openspec/specs/dep-updates-loop.md`
**Files Added:** `loops/dep-updates/*` (loop.yaml, playbook.md, README.md, hooks/{semver,registry,updates}.ts, index.ts), `test/loops/dep-updates.test.ts`
**Verification:** typecheck + lint + 39 tests + build all passing
