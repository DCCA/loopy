# Proposal: Eval-Set Drift Loop

**Change ID:** `add-eval-set-drift`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Summary

Add `loops/eval-set-drift/`: a stateful loop that surfaces production categories missing from the eval set as proposed new eval cases in a report PR, recording surfaced categories in the StateStore so each reports once. Injected boundaries (no
network); wired into the catalog + `loopy run` + package exports; unit-tested
with fakes and a memory `StateStore`.

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 240 tests + build all passing
