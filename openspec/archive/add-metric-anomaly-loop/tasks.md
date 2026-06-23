# Implementation Tasks: Metric Anomaly Loop

**Change ID:** `add-metric-anomaly-loop`

---

## Phase 1: Loop
- [x] 1.1 `hooks/anomaly.ts` (MetricSource, detectAnomalies z-score)
- [x] 1.2 `index.ts` (+ renderAnomalyBrief, fromManifest)
- [x] 1.3 loop.yaml, playbook, README
- [x] 1.4 Unit tests

## Phase 2: CLI
- [x] 2.1 Catalog entry + `loopy run metric-anomaly` (LOOPY_METRICS_FILE)
- [x] 2.2 Package export

**Quality Gate:** typecheck + lint + tests + build

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
