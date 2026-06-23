# Proposal: Performance Budget Loop

**Change ID:** `add-perf-budget`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Summary

Add `loops/perf-budget/`: a deterministic loop that flags metrics that regress beyond tolerance vs a stored baseline and writes a report PR. Injected boundary
(no network); wired into the catalog + `loopy run` + package exports; unit-tested
with fakes.

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 200 tests + build all passing
