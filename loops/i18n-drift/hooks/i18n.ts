/** The translation keys present for a single locale. */
export interface LocaleKeys {
  locale: string;
  keys: string[];
}

/**
 * The locale data boundary: returns the default locale's keys and the keys of
 * every other locale. Injectable so the loop stays deterministic (no I/O here).
 */
export interface LocaleSource {
  defaultKeys(): Promise<string[]>;
  locales(): Promise<LocaleKeys[]>;
}

/** Keys present in the default locale but missing from `localeKeys`, sorted. */
export function findMissing(defaultKeys: string[], localeKeys: string[]): string[] {
  const present = new Set(localeKeys);
  return defaultKeys.filter((k) => !present.has(k)).sort();
}

/** Keys present in `localeKeys` but absent from the default locale, sorted. */
export function findOrphaned(defaultKeys: string[], localeKeys: string[]): string[] {
  const present = new Set(defaultKeys);
  return localeKeys.filter((k) => !present.has(k)).sort();
}

/** The drift for a single locale relative to the default locale. */
export interface LocaleDrift {
  locale: string;
  missing: string[];
  orphaned: string[];
}

/**
 * Compute drift for each locale against the default key set. Only locales that
 * have at least one missing or orphaned key are returned, in input order.
 */
export function computeDrift(defaultKeys: string[], locales: LocaleKeys[]): LocaleDrift[] {
  const drift: LocaleDrift[] = [];

  for (const locale of locales) {
    const missing = findMissing(defaultKeys, locale.keys);
    const orphaned = findOrphaned(defaultKeys, locale.keys);
    if (missing.length === 0 && orphaned.length === 0) continue;
    drift.push({ locale: locale.locale, missing, orphaned });
  }

  return drift;
}
