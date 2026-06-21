# Proposal: Auto-Docs Loop

**Change ID:** `add-auto-docs-loop`
**Created:** 2026-06-21
**Status:** Draft

---

## Problem Statement

- **What problem are we solving?** Documentation drifts out of sync with code.
  READMEs, API references, and usage examples go stale as code changes, and
  keeping them current is tedious manual work teams routinely skip.
- **Who is affected?** Maintainers and consumers of any repo that imports loopy —
  both the team that owns the docs and the downstream users who rely on them.
- **Current pain point:** Doc updates are reactive, inconsistent, and easy to
  forget. There is no low-effort, reviewable, repeatable way to keep docs aligned
  with the code.

This is also loopy's **first loop** — it establishes the loop contract, the
manifest format, and the runner/adapter pattern that every future loop reuses.

## Proposed Solution

Ship `loops/auto-docs/`, a loop that detects documentation drift and opens a
**pull request** with regenerated/updated docs. It is the reference
implementation of loopy's `trigger → detect → act → output → guardrails`
contract.

- **Key components**
  - `loop.yaml` — manifest (trigger, inputs, doc targets, guardrails)
  - `playbook.md` — agent instructions for the `act` (doc-regeneration) phase
  - `hooks/` — deterministic helpers (drift detection, file globbing, PR assembly)
  - Minimal **core** types + runner needed to execute one loop end-to-end
  - One **adapter** to run it (GitHub Action) — Claude Code skill adapter deferred
- **Technical approach**
  - `detect`: compare doc-relevant code (public API surface, exported symbols,
    config) against current docs; if drift is found, mark work needed.
  - `act`: an AI step driven by `playbook.md` updates the affected docs.
  - `output`: open a PR with the diff; never commit directly to the default branch.
  - `guardrails`: max-files cap, path allowlist, idempotency (no PR when no drift),
    skip if an open auto-docs PR already exists.
- **Expected outcomes:** docs stay current with minimal effort; a working,
  reusable loop scaffold the rest of the catalog builds on.

## Scope

### In Scope
- The `auto-docs` loop folder (`loop.yaml`, `playbook.md`, `hooks/`)
- Minimal core contract types + a runner able to execute a single loop
- One runtime adapter: **GitHub Action** (scheduled + manual dispatch)
- Drift detection for Markdown docs derived from a defined code surface
- PR-based output with guardrails (caps, allowlist, idempotency)
- Unit tests for `detect` and deterministic hooks

### Out of Scope
- The full catalog of other loops (covered by the separate research effort)
- Claude Code skill adapter (follow-up change)
- Non-Markdown doc formats (e.g. generated HTML sites), i18n of docs
- Auto-merge of doc PRs (always human-reviewed for v1)

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Core framework | Yes | Introduce loop contract types + minimal runner |
| Adapters | Yes | New GitHub Action adapter |
| Loops catalog | Yes | New `loops/auto-docs/` loop |
| Build/tooling | Yes | TS project setup, lint/typecheck/test scripts |
| Published API | Yes | First exported surface (loop + runner entry points) |

## Architecture Considerations

- Establishes the canonical loop folder layout (`loop.yaml` + `playbook.md` +
  `hooks/`) referenced in `openspec/project.md`.
- The runner must stay loop-agnostic: it reads the manifest, runs phases, and
  enforces guardrails — it knows nothing auto-docs-specific.
- The GitHub Action adapter binds the runner to a CI trigger and handles PR
  creation; future adapters (Claude Code skill) reuse the same runner.
- Dependency on an AI provider (Claude) for the `act` phase, isolated behind the
  playbook so the core stays provider-light.

## Success Criteria

- [ ] Running the auto-docs loop on a repo with drifted docs opens a single PR
      that correctly updates the affected docs.
- [ ] Running it on an in-sync repo produces **no** PR (idempotent / fail-safe).
- [ ] Guardrails enforced: respects path allowlist and max-files cap; skips when
      an open auto-docs PR already exists.
- [ ] `loop.yaml` + runner execute the loop with no auto-docs logic in core.
- [ ] `detect` logic and deterministic hooks covered by passing unit tests.
- [ ] Loop runs via the GitHub Action adapter on schedule and manual dispatch.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI writes inaccurate/hallucinated docs | Med | High | PR-only output, human review required, scoped diffs, path allowlist |
| Noisy/duplicate PRs on every run | Med | Med | Idempotency check + skip when open auto-docs PR exists |
| Over-broad changes (touches unrelated files) | Med | Med | Max-files cap + path allowlist + fail-safe (no partial apply) |
| Core leaks auto-docs specifics | Low | Med | Keep runner manifest-driven; loop logic stays in the loop folder |
| Provider/API cost or rate limits | Low | Med | Run on schedule (not per-commit); only invoke `act` when drift detected |
