# Implementation Tasks: Incident Follow-up Loop

**Change ID:** `add-incident-followup-loop`

---

## Phase 1: Loop
- [x] 1.1 `hooks/incidents.ts` (IncidentSource, findOverdue, findRecurrences, normalizeCause)
- [x] 1.2 `index.ts` (+ renderDigest, fromManifest)
- [x] 1.3 loop.yaml, playbook, README
- [x] 1.4 Unit tests

## Phase 2: CLI
- [x] 2.1 Catalog entry + `loopy run incident-followup` (LOOPY_INCIDENTS_FILE)
- [x] 2.2 Package export

**Quality Gate:** typecheck + lint + tests + build

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
