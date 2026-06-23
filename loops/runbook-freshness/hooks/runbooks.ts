export interface Runbook {
  path: string;
  lastReviewedIso: string;
}

export interface RunbookSource {
  runbooks(): Promise<Runbook[]>;
}

export interface StaleRunbook {
  path: string;
  daysSinceReview: number;
}

const DAY_MS = 86_400_000;

/**
 * Find runbooks whose last review is older than `intervalDays`.
 *
 * `daysSinceReview` is `floor((now - lastReviewed) / 86400000)`. A runbook is
 * stale when `daysSinceReview > intervalDays`. Entries with an unparseable
 * `lastReviewedIso` are skipped. Result is sorted by `daysSinceReview`
 * descending.
 */
export function staleRunbooks(
  runbooks: Runbook[],
  nowIso: string,
  intervalDays: number,
): StaleRunbook[] {
  const now = Date.parse(nowIso);

  const stale: StaleRunbook[] = [];
  for (const runbook of runbooks) {
    const reviewed = Date.parse(runbook.lastReviewedIso);
    if (Number.isNaN(reviewed)) continue;
    const daysSinceReview = Math.floor((now - reviewed) / DAY_MS);
    if (daysSinceReview > intervalDays) {
      stale.push({ path: runbook.path, daysSinceReview });
    }
  }

  stale.sort((a, b) => b.daysSinceReview - a.daysSinceReview);
  return stale;
}
