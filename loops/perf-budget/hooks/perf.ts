export interface Metric {
  name: string;
  value: number;
}

/** The measurement boundary: returns the metrics measured for the current build (no I/O here). */
export interface Measurer {
  current(): Promise<Metric[]>;
}

export interface Regression {
  name: string;
  value: number;
  baseline: number;
  pct: number;
}

/**
 * Flag NEW regressions: metrics whose measured value exceeds their stored
 * baseline by more than `tolerance`.
 *
 * For each metric that has a baseline entry:
 * - it is a regression when `value > baseline * (1 + tolerance)`
 * - `pct = round((value - baseline) / baseline * 100)`
 *
 * Metrics without a baseline are ignored (a brand-new metric is not a
 * regression). Results are sorted by `pct` descending.
 */
export function regressions(
  current: Metric[],
  baseline: Record<string, number>,
  tolerance: number,
): Regression[] {
  const out: Regression[] = [];

  for (const m of current) {
    const base = baseline[m.name];
    if (base === undefined) continue;
    if (m.value > base * (1 + tolerance)) {
      out.push({
        name: m.name,
        value: m.value,
        baseline: base,
        pct: Math.round(((m.value - base) / base) * 100),
      });
    }
  }

  out.sort((a, b) => b.pct - a.pct);
  return out;
}
