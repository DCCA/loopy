# Proposal: Test Impact Budget Loop

**Change ID:** `add-test-impact-budget`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Summary

Add `loops/test-impact-budget/`: a stateful loop that tracks per-test runtime against an EWMA baseline in the StateStore, flags tests that grew past a threshold, and writes a report PR while rolling the baseline forward. Injected boundaries (no
network); wired into the catalog + `loopy run` + package exports; unit-tested
with fakes and a memory `StateStore`.

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 240 tests + build all passing
