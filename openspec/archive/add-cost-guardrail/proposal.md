# Proposal: Cost Guardrail Loop

**Change ID:** `add-cost-guardrail`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Summary

Add `loops/cost-guardrail/`: a stateful loop that tracks per-resource idle streaks in the StateStore (grace period) and proposes a remediation report behind a human Gate once a resource is idle past minStreak; never auto-deletes. Injected boundaries (no
network); wired into the catalog + `loopy run` + package exports; unit-tested
with fakes and a memory `StateStore`.

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 240 tests + build all passing
