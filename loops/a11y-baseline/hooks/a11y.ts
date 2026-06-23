/**
 * Accessibility scan boundary + the baseline diff logic.
 *
 * A `Violation` is an axe-core-style finding (a rule `id` flagged on a DOM
 * `selector`). The baseline is the set of *accepted* violations (debt); the
 * loop fails only on violations that are not already in the baseline.
 */

export interface Violation {
  /** the rule id that failed (e.g. "color-contrast") */
  id: string;
  /** the DOM selector the rule failed on */
  selector: string;
  /** axe-style severity, advisory only (e.g. "serious", "critical") */
  impact?: string;
}

/** The scan boundary: returns the current set of violations (no browser here). */
export interface A11yScanner {
  scan(): Promise<Violation[]>;
}

/** Stable identity for a violation: `${id}@${selector}`. */
export function violationKey(v: Violation): string {
  return `${v.id}@${v.selector}`;
}

/**
 * Violations in `current` whose key is NOT in the baseline — i.e. regressions
 * introduced since the baseline was taken. Sorted by key for stable output.
 */
export function newViolations(current: Violation[], baseline: Violation[]): Violation[] {
  const baselineKeys = new Set(baseline.map(violationKey));
  return current
    .filter((v) => !baselineKeys.has(violationKey(v)))
    .sort((a, b) => violationKey(a).localeCompare(violationKey(b)));
}

/**
 * Violations in `baseline` whose key is NOT in `current` — debt that has been
 * resolved and can be removed from the baseline. Sorted by key for stable output.
 */
export function fixedViolations(current: Violation[], baseline: Violation[]): Violation[] {
  const currentKeys = new Set(current.map(violationKey));
  return baseline
    .filter((v) => !currentKeys.has(violationKey(v)))
    .sort((a, b) => violationKey(a).localeCompare(violationKey(b)));
}
