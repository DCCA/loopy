/**
 * The eval-set-drift detection primitives. Pure and deterministic: given the
 * categories present in the eval/golden set and the categories observed in
 * production samples, surface the production categories that have no
 * representation in the eval set.
 */

/**
 * The loop's only external boundary. Both sides are category labels: the
 * `evalCategories` describe the golden/eval dataset, the `productionCategories`
 * describe a recent sample of real inputs. Categories are compared after
 * {@link normalizeCategory}.
 */
export interface DriftSource {
  evalCategories(): Promise<string[]>;
  productionCategories(): Promise<string[]>;
}

/**
 * Normalize a free-text category label into a stable key: lowercased, trimmed,
 * and inner whitespace collapsed to single spaces.
 */
export function normalizeCategory(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Compute the production categories not represented in the eval set.
 *
 * Both inputs are normalized via {@link normalizeCategory}; empty results after
 * normalization are dropped. The output is the set of normalized production
 * categories absent from the normalized eval categories, de-duplicated and
 * sorted ascending.
 */
export function uncovered(evalCats: string[], prodCats: string[]): string[] {
  const covered = new Set(
    evalCats.map((c) => normalizeCategory(c)).filter((c) => c.length > 0),
  );

  const result = new Set<string>();
  for (const raw of prodCats) {
    const c = normalizeCategory(raw);
    if (c.length === 0) continue;
    if (covered.has(c)) continue;
    result.add(c);
  }

  return [...result].sort();
}
