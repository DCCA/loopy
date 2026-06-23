# Implementation Tasks: Codemod-Campaign Loop

**Change ID:** `add-codemod-campaign`
**Status:** Implementation Complete

---

## Phase 1: Campaign engine
- [x] 1.1 `hooks/campaign.ts` — ledger types, remainingTargets/selectBatch/reconcile/renderBurndown
- [x] 1.2 `index.ts` — `advanceCampaign` (StateStore ledger + pilot Gate + throttle)
- [x] 1.3 README + playbook
- [x] 1.4 Unit tests (full lifecycle + throttle + failure)

## Phase 2: Packaging
- [x] 2.1 Package export

**Quality Gate:** typecheck + lint + 166 tests + build — PASSED

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
