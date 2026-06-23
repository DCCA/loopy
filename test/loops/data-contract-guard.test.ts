import { describe, expect, it } from "vitest";
import {
  createGate,
  createMemoryStateStore,
  runLoop,
  silentLogger,
  type RunContext,
} from "../../src/core/index.js";
import {
  createDataContractGuardLoop,
  diffSchema,
  isBreaking,
  type ContractServices,
  type Schema,
} from "../../loops/data-contract-guard/index.js";

const ctx: RunContext = { repoRoot: "/tmp/repo", logger: silentLogger };

const guardrails = { pathAllowlist: ["contracts/**"], maxFiles: 5, skipIfOpenPr: true };
const trigger = { type: "event", events: ["pull_request"] } as const;
const config = { baselinePath: "contracts/schema.json" };

const base: Schema = {
  fields: [
    { name: "id", type: "string", required: true },
    { name: "name", type: "string", required: true },
  ],
};

/** A schema source returning a fixed schema. */
const sourceOf = (schema: Schema): ContractServices["source"] => ({ current: async () => schema });

function loop(services: ContractServices) {
  return createDataContractGuardLoop(config, guardrails, trigger, services);
}

describe("diffSchema / isBreaking", () => {
  it("flags a removed field as breaking", () => {
    const next: Schema = { fields: [{ name: "id", type: "string", required: true }] };
    const changes = diffSchema(base, next);
    expect(changes).toEqual([{ kind: "removed", field: "name" }]);
    expect(isBreaking(changes)).toBe(true);
  });

  it("flags a type change as breaking", () => {
    const next: Schema = {
      fields: [
        { name: "id", type: "number", required: true },
        { name: "name", type: "string", required: true },
      ],
    };
    const changes = diffSchema(base, next);
    expect(changes).toEqual([{ kind: "type-changed", field: "id", detail: "string → number" }]);
    expect(isBreaking(changes)).toBe(true);
  });

  it("flags a new required field as breaking", () => {
    const next: Schema = {
      fields: [...base.fields, { name: "email", type: "string", required: true }],
    };
    const changes = diffSchema(base, next);
    expect(changes).toEqual([{ kind: "required-added", field: "email" }]);
    expect(isBreaking(changes)).toBe(true);
  });

  it("treats a new optional field as additive", () => {
    const next: Schema = {
      fields: [...base.fields, { name: "nickname", type: "string", required: false }],
    };
    const changes = diffSchema(base, next);
    expect(changes).toEqual([{ kind: "added", field: "nickname" }]);
    expect(isBreaking(changes)).toBe(false);
  });

  it("sorts changes by field name", () => {
    const next: Schema = {
      fields: [
        { name: "name", type: "string", required: true },
        { name: "alpha", type: "string", required: false },
        { name: "zeta", type: "string", required: false },
      ],
    };
    const changes = diffSchema(base, next);
    expect(changes.map((c) => c.field)).toEqual(["alpha", "id", "zeta"]);
  });
});

describe("data-contract-guard loop", () => {
  it("establishes a baseline on the first run (comment + state saved)", async () => {
    const state = createMemoryStateStore();
    const r = await runLoop(loop({ source: sourceOf(base), state }), ctx);
    expect(r.status).toBe("produced");
    expect(r.outputKind).toBe("comment");
    expect(r.comment).toContain("baseline established");
    expect(await state.load("data-contract:baseline")).not.toBeNull();
  });

  it("auto-records the baseline on an additive change (comment)", async () => {
    const state = createMemoryStateStore();
    await state.save("data-contract:baseline", base);
    const next: Schema = {
      fields: [...base.fields, { name: "nickname", type: "string", required: false }],
    };
    const r = await runLoop(loop({ source: sourceOf(next), state }), ctx);
    expect(r.status).toBe("produced");
    expect(r.outputKind).toBe("comment");
    expect(r.comment).toContain("Additive");
    expect(r.comment).toContain("`nickname`");
    const stored = (await state.load("data-contract:baseline")) as Schema;
    expect(stored.fields).toHaveLength(3); // baseline moved
  });

  it("blocks a breaking change with a comment and keeps the baseline", async () => {
    const state = createMemoryStateStore();
    await state.save("data-contract:baseline", base);
    const next: Schema = { fields: [{ name: "id", type: "string", required: true }] };

    const r = await runLoop(loop({ source: sourceOf(next), state }), ctx);
    expect(r.status).toBe("produced");
    expect(r.outputKind).toBe("comment");
    expect(r.comment).toContain("Breaking");
    expect(r.comment).toContain("`name`");
    expect(r.comment).toContain("approve the gate");
    const stored = (await state.load("data-contract:baseline")) as Schema;
    expect(stored.fields).toHaveLength(2); // unchanged
  });

  it("writes the baseline PR once the acceptance gate is approved", async () => {
    const state = createMemoryStateStore();
    await state.save("data-contract:baseline", base);
    const next: Schema = { fields: [{ name: "id", type: "string", required: true }] };
    const services: ContractServices = { source: sourceOf(next), state };

    // Breaking change → blocked behind the gate (comment).
    let r = await runLoop(loop(services), ctx);
    expect(r.outputKind).toBe("comment");
    expect(r.comment).toContain("Breaking");

    // Approve and re-run → baseline acceptance PR.
    await createGate(state).decide("data-contract:accept", "approved");
    r = await runLoop(loop(services), ctx);
    expect(r.status).toBe("produced");
    expect(r.outputKind).toBe("pull-request");
    expect(r.changes?.[0]?.path).toBe("contracts/schema.json");
    const stored = (await state.load("data-contract:baseline")) as Schema;
    expect(stored.fields).toHaveLength(1); // baseline moved on approval
  });

  it("does no work when the schema matches the baseline", async () => {
    const state = createMemoryStateStore();
    await state.save("data-contract:baseline", base);
    const r = await runLoop(loop({ source: sourceOf(base), state }), ctx);
    expect(r.status).toBe("no-work");
  });
});
