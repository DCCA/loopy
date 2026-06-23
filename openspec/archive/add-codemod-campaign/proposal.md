# Proposal: Codemod-Campaign Loop

**Change ID:** `add-codemod-campaign`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Problem Statement

Large codebase migrations (codemods) can't land in one PR — they must be fanned
across many small, reviewable PRs, throttled, tracked, and resumed over days.
This is the #1-ranked complex loop from the deep dive and the best showcase of
loopy's long-horizon primitives together (StateStore + Gate + resumable advance).

## Proposed Solution

Add `loops/codemod-campaign/`: `advanceCampaign(...)` drives a deterministic
codemod across the codebase in throttled batches of PRs, tracked in a durable
ledger (StateStore), reconciled against real PR state each run, with the pilot
batch human-gated. Each call advances at most one batch; idempotent and
resumable.

## Scope

### In Scope
- `loops/codemod-campaign/` (hooks/campaign.ts, index.ts, README, playbook)
- Ledger in StateStore; pilot Gate; throttle by `maxOpenPrs`; reconcile by PR state
- Injected boundaries: `codemod`, `targets`, `runner` (tests), `prs` (open + state)
- Unit tests (pilot gate → batches → throttle → reconcile/merge → completion → failure)
- Package export

### Out of Scope
- A GitHub-backed `CampaignPrs` adapter (injected boundary for now; follow-up)
- A `loopy campaign <id>` CLI verb (follow-up)
- AI assistance for residual hard files (codemod is deterministic here)

## Success Criteria

- [x] No PRs open until the pilot batch is approved (Gate).
- [x] Throttles at `maxOpenPrs`; one batch per advance.
- [x] Reconciles against real PR state: merged → migrated, closed → returned to pool.
- [x] Completes when nothing remains and no batches are open.
- [x] Failed batch (red tests) opens no PR and is recorded.

## Risks & Mitigations

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Campaign runaway | Med | High | open-PR cap + one batch/run |
| Stale ledger | Med | Med | reconcile vs real PR state every run |
| Partial-rollout corruption | Low | Med | migrate only on merge; red batch → no PR |
| Gate bypass | Low | High | no PRs until pilot approved |

---

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 166 tests + build all passing
