# Proposal: Dependency Major Migration Loop

**Change ID:** `add-dep-major-migration`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Summary

Add `loops/dep-major-migration/`: an export-only, programmatic long-horizon loop (`advance*` over
`runPlan`) that migrates one major dependency bump on runPlan (verify build → human-gated approval → emit the manifest bump); a red build is never gated or proposed. Injected boundaries (no network); resumable via the
durable `StateStore` and human `Gate`; package export + spec added; unit-tested
with fakes and a memory `StateStore`.

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 249 tests + build all passing
