# Proposal: i18n Drift Loop

**Change ID:** `add-i18n-drift`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Summary

Add `loops/i18n-drift/`: a deterministic loop that flags translation keys missing from locales (and orphaned keys) and writes a status report PR. Injected boundary
(no network); wired into the catalog + `loopy run` + package exports; unit-tested
with fakes.

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 200 tests + build all passing
