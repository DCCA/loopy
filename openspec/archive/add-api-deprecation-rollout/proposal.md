# Proposal: API Deprecation Rollout Loop

**Change ID:** `add-api-deprecation-rollout`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Summary

Add `loops/api-deprecation-rollout/`: an export-only, programmatic long-horizon loop (`advance*` over
`runPlan`) that drives an API deprecation across long-horizon stages on runPlan (announce → grace-period wait → caller-drain → human-gated removal), resuming from plan:<planId> in the StateStore. Injected boundaries (no network); resumable via the
durable `StateStore` and human `Gate`; package export + spec added; unit-tested
with fakes and a memory `StateStore`.

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 249 tests + build all passing
