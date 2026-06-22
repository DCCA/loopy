# Implementation Tasks: Long-Horizon Runtime Primitives

**Change ID:** `add-long-horizon-runtime`

---

## Phase 1: Primitives
- [x] 1.1 `state.ts` — StateStore + memory + file implementations
- [x] 1.2 `gate.ts` — approval gate (require/decide/get) over the state store
- [x] 1.3 `steps.ts` — resumable `runPlan` with done/waiting/blocked outcomes
- [x] 1.4 `index.ts` re-exports

## Phase 2: Tests & wiring
- [x] 2.1 Unit tests (state, gate, steps incl. resumption)
- [x] 2.2 Export `longrun` from `src/core`
- [x] 2.3 No regression to existing runner/loops

**Quality Gate:** typecheck + lint + tests + build

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
