# Proposal: Data Contract Guard Loop

**Change ID:** `add-data-contract-guard`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Summary

Add `loops/data-contract-guard/`: a stateful loop that diffs the current schema against an approved baseline in the StateStore; additive changes auto-record, breaking changes are blocked behind a human Gate before a PR records the new baseline. Injected boundaries (no
network); wired into the catalog + `loopy run` + package exports; unit-tested
with fakes and a memory `StateStore`.

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 240 tests + build all passing
