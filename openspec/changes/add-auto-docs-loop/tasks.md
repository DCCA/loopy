# Implementation Tasks: Auto-Docs Loop

**Change ID:** `add-auto-docs-loop`

---

## Phase 1: Foundation (Core Contract & Runner)

- [ ] 1.1 Set up TypeScript project (ESM, tsconfig, lint, vitest, npm scripts)
- [ ] 1.2 Define loop contract types in `src/core/` (trigger, detect, act, output, guardrails)
- [ ] 1.3 Implement a manifest loader for `loop.yaml`
- [ ] 1.4 Implement a loop-agnostic runner that executes phases and enforces guardrails
- [ ] 1.5 Unit tests for runner + guardrail enforcement

**Quality Gate:**
- [ ] Lint + typecheck pass
- [ ] Core unit tests pass

---

## Phase 2: Auto-Docs Loop Logic

- [ ] 2.1 Create `loops/auto-docs/loop.yaml` (trigger, doc targets, path allowlist, caps)
- [ ] 2.2 Implement `detect` (code-surface vs docs drift) in `loops/auto-docs/hooks/`
- [ ] 2.3 Write `loops/auto-docs/playbook.md` (agent instructions for the `act` phase)
- [ ] 2.4 Implement PR-assembly hook (diff → branch → PR payload)
- [ ] 2.5 Unit tests for `detect` and deterministic hooks (including no-drift = no output)

**Quality Gate:**
- [ ] Lint + typecheck pass
- [ ] Detect tests pass (drift and no-drift cases)

---

## Phase 3: GitHub Action Adapter

- [ ] 3.1 Implement `src/adapters/github-action` binding runner → CI
- [ ] 3.2 Wire triggers: scheduled (cron) + manual `workflow_dispatch`
- [ ] 3.3 Implement PR creation + idempotency (skip if open auto-docs PR exists)
- [ ] 3.4 Provide example workflow YAML for consumers

**Quality Gate:**
- [ ] Lint + typecheck pass
- [ ] Adapter logic tested (mocked CI/GitHub interactions)

---

## Phase 4: Integration & Polish

- [ ] 4.1 End-to-end dry run against a sample repo (drift → PR)
- [ ] 4.2 Verify fail-safe: in-sync repo produces no PR
- [ ] 4.3 Document loop usage + customization in repo README / loop README
- [ ] 4.4 Define the published package entry points (exports)

**Quality Gate:**
- [ ] All tests pass
- [ ] Lint + typecheck clean
- [ ] Documentation synced

---

## Completion Checklist

- [ ] All phases complete
- [ ] All quality gates passed
- [ ] Success criteria in proposal.md verified
- [ ] Documentation synced
- [ ] Ready for `/openspec-archive`
