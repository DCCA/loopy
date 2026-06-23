# Delta: Metric Anomaly Loop

**Change ID:** `add-metric-anomaly-loop`
**Affects:** `loops/metric-anomaly/`, CLI catalog/run

---

## ADDED

### Requirement: Z-Score Anomaly Detection

The metric-anomaly loop flags a series whose latest point deviates from its
baseline by at least the z-score threshold.

#### Scenario: Spike flagged
- GIVEN a metric series whose latest point is a clear outlier vs. its baseline
- WHEN detect runs
- THEN it reports work needed and identifies the metric

#### Scenario: Quiet series ignored
- GIVEN flat, low-variance, or too-short series
- WHEN detect runs
- THEN it reports no work needed and produces no PR

---

### Requirement: Anomaly Brief Output

The loop writes a deterministic markdown anomaly brief as a reviewable PR within
the reports allowlist.

#### Scenario: Brief produced
- GIVEN one or more anomalies
- WHEN the loop acts
- THEN it writes an anomaly brief for review

## MODIFIED

(None)

## REMOVED

(None)
