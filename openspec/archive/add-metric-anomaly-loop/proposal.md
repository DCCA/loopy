# Proposal: Metric Anomaly Loop

**Change ID:** `add-metric-anomaly-loop`
**Created:** 2026-06-22
**Status:** Implementation Complete
**Completed:** 2026-06-22

---

## Problem Statement

Metric regressions hide until someone notices. A cheap, deterministic detector
that watches key metrics and writes a reviewable anomaly brief is a reusable
engine (feeds weekly briefs, churn, data-quality).

## Proposed Solution

Add `loops/metric-anomaly/`: deterministic z-score anomaly detection over an
injected metric source, writing a markdown anomaly brief as a PR. No AI required;
the metric data is an injected boundary. Reuses the core runner, guardrails, and
GitHub adapter; turnkey via a file-based metric source.

- **detect** — z-score of each series' latest point vs. its baseline; work needed if any |z| ≥ threshold.
- **act** — write a deterministic anomaly brief to `reports/anomalies.md`.
- **output** — one PR; **guardrails** allowlist `reports/**`.

## Scope

### In Scope
- `loops/metric-anomaly/` (hooks/anomaly.ts, index.ts, loop.yaml, playbook, README)
- Catalog entry + `loopy run metric-anomaly` (metrics from `LOOPY_METRICS_FILE`)
- Unit tests

### Out of Scope
- AI narration / root-cause correlation (future enhancement)
- Live metric-warehouse connectors (injected boundary)

## Success Criteria

- [ ] Flags a clear spike; ignores flat/low-variance/short series.
- [ ] No anomaly → no PR (fail-safe).
- [ ] Writes a brief within the `reports/**` allowlist.

## Risks & Mitigations

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Acting on noisy metrics | Med | Med | Output is a brief for review, not an action; z threshold; idempotent file |
| Alert fatigue | Med | Low | Single overwritten report; skipIfOpenPr |

---

## Archive Information

**Archived:** 2026-06-22
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 126 tests + build all passing
