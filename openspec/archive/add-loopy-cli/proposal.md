# Proposal: loopy CLI — 1-Click Loop Import

**Change ID:** `add-loopy-cli`
**Created:** 2026-06-21
**Status:** Implementation Complete
**Completed:** 2026-06-21

---

## Problem Statement

Adopting a loop today means hand-writing a GitHub workflow, wiring boundaries,
and configuring secrets. The product differentiator we want is **importing a
loop with one click**: a single command that drops a ready-to-run loop into a
repository.

## Proposed Solution

Add a `loopy` CLI (`npx loopy …`) with three commands:

- **`loopy add <loop>`** — the 1-click import. Scaffolds
  `.github/workflows/loopy-<loop>.yml`, a ready-to-run workflow wired to the
  loop's trigger, output, and required secrets. One command, no hand-editing.
- **`loopy list`** — list available loops with descriptions and what they need.
- **`loopy run <loop>`** — execute a loop end-to-end (used by the scaffolded
  workflow). Runs deterministic loops (`dep-updates`, `changelog`) with built-in
  default boundaries (npm registry, git, GitHub REST from env). Loops requiring
  an AI step report clear setup guidance rather than failing opaquely.

A shared **catalog** (loop id, description, trigger, output, required secrets,
whether `run` is turnkey) backs all three commands so they stay consistent.

## Scope

### In Scope
- `loopy` bin entry; `add`, `list`, `run` commands; arg parsing + help
- Catalog of the six loops; workflow template generation per trigger/output
- Default boundary construction for deterministic loops in `run`
- Unit tests for catalog, template rendering, `add` (temp dir), arg parsing, and
  `run` dispatch (injected fakes)

### Out of Scope
- A hosted GitHub App / web UI (separate, larger effort)
- Built-in AI providers for AI loops' `act` step (boundary remains injectable)
- Publishing the package to npm

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Core framework | No | Reuses runner/adapters |
| Package | Yes | New `bin`, `src/cli/*`, exports |
| Loops | No | Consumed via the catalog |

## Architecture Considerations

The CLI is a thin orchestration layer over the existing core + adapters + loop
factories. `run` constructs the same injected boundaries used in tests, but from
the environment; testability is preserved by allowing injected services.

## Success Criteria

- [ ] `loopy add <loop>` writes a valid, ready-to-run workflow for that loop.
- [ ] `loopy add` rejects unknown loops with a helpful message.
- [ ] `loopy list` shows all six loops with their needs.
- [ ] `loopy run` executes a deterministic loop end-to-end (with injected fakes in tests).
- [ ] Generated workflow matches the loop's trigger (schedule vs PR event) and secrets.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| `run` can't fully run AI loops | High | Low | Turnkey for deterministic loops; clear guidance otherwise |
| Generated workflow drift | Med | Low | Single catalog drives template + list + run |
| Bin shebang/ESM issues | Low | Med | tsc preserves shebang; test `main()` directly |

---

## Archive Information

**Archived:** 2026-06-21
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 64 tests + build all passing
