export interface MetricPoint {
  t: string;
  value: number;
}

export interface MetricSeries {
  name: string;
  points: MetricPoint[];
}

/** The metric data boundary: returns the series to inspect (no network here). */
export interface MetricSource {
  series(): Promise<MetricSeries[]>;
}

export interface Anomaly {
  metric: string;
  value: number;
  mean: number;
  std: number;
  z: number;
  direction: "up" | "down";
}

/**
 * Detect anomalies in each series by comparing its final point to the
 * z-score baseline formed by all preceding points.
 *
 * For each series with `>= 3` points:
 * - baseline = every point except the last
 * - mean and population standard deviation are computed over the baseline
 * - the last point's z-score is `(last.value - mean) / std` when `std > 0`,
 *   otherwise `0`
 * - it is an anomaly when `std > 0` and `|z| >= threshold`
 * - direction is `"up"` when `last.value >= mean`, otherwise `"down"`
 *
 * Series with fewer than 3 points or a flat baseline (`std == 0`) are skipped.
 * Results are sorted by `|z|` descending.
 */
export function detectAnomalies(series: MetricSeries[], threshold: number): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const s of series) {
    if (s.points.length < 3) continue;

    const last = s.points[s.points.length - 1];
    if (last === undefined) continue;

    const baseline = s.points.slice(0, -1);
    const n = baseline.length;
    if (n === 0) continue;

    const mean = baseline.reduce((sum, p) => sum + p.value, 0) / n;
    const variance = baseline.reduce((sum, p) => sum + (p.value - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    if (std === 0) continue;

    const z = (last.value - mean) / std;
    if (Math.abs(z) < threshold) continue;

    anomalies.push({
      metric: s.name,
      value: last.value,
      mean,
      std,
      z,
      direction: last.value >= mean ? "up" : "down",
    });
  }

  anomalies.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  return anomalies;
}
