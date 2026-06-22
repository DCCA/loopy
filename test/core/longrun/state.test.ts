import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFileStateStore, createMemoryStateStore } from "../../../src/core/longrun/index.js";

describe("createMemoryStateStore", () => {
  it("saves and loads values", async () => {
    const store = createMemoryStateStore();
    await store.save("k", { n: 1 });
    expect(await store.load<{ n: number }>("k")).toEqual({ n: 1 });
  });

  it("returns null for a missing key", async () => {
    const store = createMemoryStateStore();
    expect(await store.load("nope")).toBeNull();
  });

  it("deletes a key", async () => {
    const store = createMemoryStateStore();
    await store.save("k", 1);
    await store.delete("k");
    expect(await store.load("k")).toBeNull();
  });

  it("clones on save so later caller mutation does not reach storage", async () => {
    const store = createMemoryStateStore();
    const value = { tags: ["a"] };
    await store.save("k", value);
    value.tags.push("b");
    expect(await store.load<{ tags: string[] }>("k")).toEqual({ tags: ["a"] });
  });

  it("clones on load so mutating the result does not change storage", async () => {
    const store = createMemoryStateStore();
    await store.save("k", { tags: ["a"] });
    const first = await store.load<{ tags: string[] }>("k");
    first?.tags.push("b");
    expect(await store.load<{ tags: string[] }>("k")).toEqual({ tags: ["a"] });
  });
});

describe("createFileStateStore", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "loopy-state-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("roundtrips save then load", async () => {
    const store = createFileStateStore(path.join(dir, "nested"));
    await store.save("my key", { ok: true, count: 3 });
    expect(await store.load<{ ok: boolean; count: number }>("my key")).toEqual({
      ok: true,
      count: 3,
    });
  });

  it("returns null for a missing key", async () => {
    const store = createFileStateStore(dir);
    expect(await store.load("absent")).toBeNull();
  });

  it("deletes a key and is a no-op when absent", async () => {
    const store = createFileStateStore(dir);
    await store.save("k", 1);
    await store.delete("k");
    expect(await store.load("k")).toBeNull();
    // Deleting again must not throw.
    await expect(store.delete("k")).resolves.toBeUndefined();
  });
});
