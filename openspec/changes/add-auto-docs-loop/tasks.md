# Implementation Tasks: Auto-Docs Loop

**Change ID:** `add-auto-docs-loop`

---

## Phase 1: Foundation (Core Contract & Runner)

- [x] 1.1 Set up TypeScript project (ESM, tsconfig, lint, vitest, npm scripts) ✓ 2026-06-21
- [x] 1.2 Define loop contract types in `src/core/` (trigger, detect, act, output, guardrails) ✓ 2026-06-21
- [x] 1.3 Implement a manifest loader for `loop.yaml` ✓ 2026-06-21
- [x] 1.4 Implement a loop-agnostic runner that executes phases and enforces guardrails ✓ 2026-06-21
- [x] 1.5 Unit tests for runner + guardrail enforcement ✓ 2026-06-21

**Quality Gate:** PASSED (typecheck + lint + tests)

---

## Phase 2: Auto-Docs Loop Logic

- [x] 2.1 Create `loops/auto-docs/loop.yaml` (trigger, doc targets, path allowlist, caps) ✓ 2026-06-21
- [x] 2.2 Implement `detect` (code-surface vs docs drift) in `loops/auto-docs/hooks/` ✓ 2026-06-21
- [x] 2.3 Write `loops/auto-docs/playbook.md` (agent instructions for the `act` phase) ✓ 2026-06-21
- [x] 2.4 Implement PR-assembly hook (diff → branch → PR payload) ✓ 2026-06-21
- [x] 2.5 Unit tests for `detect` and deterministic hooks (including no-drift = no output) ✓ 2026-06-21

**Quality Gate:** PASSED (drift + no-drift cases covered)

---

## Phase 3: GitHub Action Adapter

- [x] 3.1 Implement `src/adapters/github-action` binding runner → CI ✓ 2026-06-21
- [x] 3.2 Wire triggers: scheduled (cron) + manual `workflow_dispatch` ✓ 2026-06-21
- [x] 3.3 Implement PR creation + idempotency (skip if open auto-docs PR exists) ✓ 2026-06-21
- [x] 3.4 Provide example workflow YAML for consumers ✓ 2026-06-21

**Quality Gate:** PASSED (REST client + publish flow tested with injected fetch/mock client)

---

## Phase 4: Integration & Polish

- [x] 4.1 End-to-end run against a sample repo (drift → produced change set) ✓ 2026-06-21 — covered by `test/loops/auto-docs.test.ts` (temp repo, full detect→act→guardrails)
- [x] 4.2 Verify fail-safe: in-sync repo produces no PR ✓ 2026-06-21 — idempotency test
- [x] 4.3 Document loop usage + customization in repo README / loop README ✓ 2026-06-21
- [x] 4.4 Define the published package entry points (exports) ✓ 2026-06-21 — `package.json` exports + `dist` build verified

**Quality Gate:** PASSED (typecheck, lint, 26 tests, clean `tsc` build)

---

## Notes

- The `act` (doc-writing) step is the loop's single AI boundary, injected as
  `services.docWriter` and driven by `playbook.md`. It is exercised in tests via
  a fake writer; wiring a live AI runner is a consumer/adapter concern.
- Live GitHub network calls are covered by `test/adapters/github-client.test.ts`
  using an injected `fetch`, not a real network round-trip.

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Success criteria in proposal.md verified
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
