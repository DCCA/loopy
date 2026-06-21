export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export type RangePrefix = "^" | "~" | "";
export type UpdateType = "major" | "minor" | "patch";

/** Parse a version like "1.2.3" (ignores any pre-release/build suffix). */
export function parseVersion(value: string): Version | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(value.trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/** Parse a dependency range like "^1.2.3", "~1.2.3", or "1.2.3". */
export function parseRange(range: string): { prefix: RangePrefix; version: Version } | null {
  const trimmed = range.trim();
  const prefix: RangePrefix = trimmed.startsWith("^") ? "^" : trimmed.startsWith("~") ? "~" : "";
  const version = parseVersion(prefix ? trimmed.slice(1) : trimmed);
  return version ? { prefix, version } : null;
}

export function compare(a: Version, b: Version): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

/** The kind of update from `from` to `to`, or null if `to` is not newer. */
export function updateType(from: Version, to: Version): UpdateType | null {
  if (compare(to, from) <= 0) return null;
  if (to.major !== from.major) return "major";
  if (to.minor !== from.minor) return "minor";
  return "patch";
}

export function formatRange(prefix: RangePrefix, v: Version): string {
  return `${prefix}${v.major}.${v.minor}.${v.patch}`;
}
