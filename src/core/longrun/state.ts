import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Durable key/value memory for long-horizon loops. Implementations persist
 * arbitrary JSON-serializable values across process runs so that a loop can be
 * paused (waiting on time or human approval) and resumed later.
 *
 * The contract is deliberately tiny: load returns `null` when a key is absent,
 * save overwrites, and delete is idempotent.
 */
export interface StateStore {
  load<T>(key: string): Promise<T | null>;
  save<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * In-memory {@link StateStore} backed by a Map. Values are deep-cloned on both
 * save and load via `structuredClone`, so callers can freely mutate the objects
 * they pass in or receive back without corrupting stored state. Useful for tests
 * and ephemeral runs.
 */
export function createMemoryStateStore(): StateStore {
  const map = new Map<string, unknown>();
  return {
    async load<T>(key: string): Promise<T | null> {
      if (!map.has(key)) return null;
      const stored = map.get(key) as T;
      // Clone on the way out so the caller can't mutate our stored reference.
      return structuredClone(stored);
    },
    async save<T>(key: string, value: T): Promise<void> {
      // Clone on the way in so later caller mutations don't reach into storage.
      map.set(key, structuredClone(value));
    },
    async delete(key: string): Promise<void> {
      map.delete(key);
    },
  };
}

/** Replace any character outside [A-Za-z0-9._-] so a key is a safe filename. */
function sanitizeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, "_");
}

/**
 * File-backed {@link StateStore}. Each key is stored as a pretty-printed JSON
 * file (`<dir>/<sanitized-key>.json`). The directory is created lazily on save.
 * Missing keys load as `null`; deleting an absent key is a no-op.
 */
export function createFileStateStore(dir: string): StateStore {
  const fileFor = (key: string): string => path.join(dir, `${sanitizeKey(key)}.json`);
  return {
    async load<T>(key: string): Promise<T | null> {
      try {
        const raw = await readFile(fileFor(key), "utf8");
        return JSON.parse(raw) as T;
      } catch (err) {
        // A missing file means "no value"; surface anything else.
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
    },
    async save<T>(key: string, value: T): Promise<void> {
      await mkdir(dir, { recursive: true });
      await writeFile(fileFor(key), `${JSON.stringify(value, null, 2)}\n`, "utf8");
    },
    async delete(key: string): Promise<void> {
      try {
        await rm(fileFor(key));
      } catch (err) {
        // Deleting a key that was never written is not an error.
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
        throw err;
      }
    },
  };
}
