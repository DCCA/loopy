# Implementation Tasks: License/SBOM Drift Loop

**Change ID:** `add-license-sbom-loop`

---

## Phase 1: Loop
- [x] 1.1 `hooks/licenses.ts` (classify, violations)
- [x] 1.2 `index.ts` (renderLicenseReport; fromManifest)
- [x] 1.3 loop.yaml, playbook, README
- [x] 1.4 Unit tests

## Phase 2: CLI
- [x] 2.1 Catalog entry + `loopy run license-sbom-drift` (LOOPY_SBOM_FILE)
- [x] 2.2 Package export

**Quality Gate:** typecheck + lint + tests + build

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
