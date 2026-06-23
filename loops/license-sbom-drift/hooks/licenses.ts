export interface SbomEntry {
  name: string;
  version: string;
  license: string;
}

/** The SBOM data boundary: returns the dependency→license inventory (no network here). */
export interface SbomSource {
  current(): Promise<SbomEntry[]>;
}

export type LicenseStatus = "allowed" | "denied" | "unknown";

export interface Classified {
  entry: SbomEntry;
  status: LicenseStatus;
}

/** Normalize a license id for comparison: trim and uppercase. */
function normalize(license: string): string {
  return license.trim().toUpperCase();
}

/** License ids that signal "no usable license information" rather than a real license. */
const UNKNOWN_IDS = new Set(["", "UNKNOWN", "UNLICENSED"]);

/**
 * Classify each dependency's license against the allowlist.
 *
 * - `"unknown"` when the license is empty / `UNKNOWN` / `UNLICENSED` (normalized);
 * - `"allowed"` when the normalized license is in the (normalized) allowlist;
 * - `"denied"` otherwise.
 */
export function classify(entries: SbomEntry[], allowlist: string[]): Classified[] {
  const allowed = new Set(allowlist.map(normalize));

  return entries.map((entry) => {
    const normalized = normalize(entry.license);
    let status: LicenseStatus;
    if (UNKNOWN_IDS.has(normalized)) {
      status = "unknown";
    } else if (allowed.has(normalized)) {
      status = "allowed";
    } else {
      status = "denied";
    }
    return { entry, status };
  });
}

/** The non-allowed classifications (denied + unknown), sorted by package name. */
export function violations(classified: Classified[]): Classified[] {
  return classified
    .filter((c) => c.status !== "allowed")
    .sort((a, b) => a.entry.name.localeCompare(b.entry.name));
}
