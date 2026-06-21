import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface SurfaceFile {
  path: string;
  hash: string;
}

export interface Fingerprint {
  version: 1;
  surface: SurfaceFile[];
  /** digest over all surface entries; the single value compared between runs */
  digest: string;
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Compute a fingerprint of the given files (relative paths) under repoRoot. */
export async function fingerprintSurface(
  repoRoot: string,
  files: string[],
): Promise<Fingerprint> {
  const surface: SurfaceFile[] = [];
  for (const rel of [...files].sort()) {
    const contents = await readFile(join(repoRoot, rel), "utf8");
    surface.push({ path: rel, hash: sha256(contents) });
  }
  const digest = sha256(surface.map((f) => `${f.path}:${f.hash}`).join("\n"));
  return { version: 1, surface, digest };
}

/** Read the stored fingerprint marker, or null if it does not exist / is invalid. */
export async function readMarker(
  repoRoot: string,
  markerPath: string,
): Promise<Fingerprint | null> {
  try {
    const raw = await readFile(join(repoRoot, markerPath), "utf8");
    const parsed = JSON.parse(raw) as Fingerprint;
    if (parsed && parsed.version === 1 && typeof parsed.digest === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/** Files present in `current` whose hash differs from (or is absent in) `previous`. */
export function diffSurface(previous: Fingerprint, current: Fingerprint): string[] {
  const prev = new Map(previous.surface.map((f) => [f.path, f.hash]));
  const cur = new Map(current.surface.map((f) => [f.path, f.hash]));
  const changed = new Set<string>();
  for (const [path, hash] of cur) {
    if (prev.get(path) !== hash) changed.add(path);
  }
  for (const path of prev.keys()) {
    if (!cur.has(path)) changed.add(path);
  }
  return [...changed].sort();
}
