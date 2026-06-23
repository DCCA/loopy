# Proposal: Accessibility Baseline Loop

**Change ID:** `add-a11y-baseline`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Summary

Add `loops/a11y-baseline/`: a deterministic loop that fails only on NEW accessibility violations vs a baseline and writes a report PR. Injected boundary
(no network); wired into the catalog + `loopy run` + package exports; unit-tested
with fakes.

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 200 tests + build all passing
