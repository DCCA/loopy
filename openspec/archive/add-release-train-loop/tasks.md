# Implementation Tasks: Release-Train Loop

**Change ID:** `add-release-train-loop`

---

## Phase 1: Loop
- [x] 1.1 `hooks/release.ts` (computeBump, nextVersion, renderReleaseNotes)
- [x] 1.2 `index.ts` (update package.json + prepend CHANGELOG; fromManifest)
- [x] 1.3 loop.yaml, playbook, README
- [x] 1.4 Unit tests

## Phase 2: CLI
- [x] 2.1 Catalog entry + `loopy run release-train` (git-backed source)
- [x] 2.2 Package export

**Quality Gate:** typecheck + lint + tests + build

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
