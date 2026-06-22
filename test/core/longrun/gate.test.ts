import { describe, expect, it } from "vitest";
import { createGate, createMemoryStateStore } from "../../../src/core/longrun/index.js";

describe("createGate", () => {
  it("require is idempotent and does not overwrite an existing request", async () => {
    const gate = createGate(createMemoryStateStore());
    const first = await gate.require("deploy", "Ship release");
    const second = await gate.require("deploy", "Different summary");

    expect(first.status).toBe("pending");
    expect(second).toEqual(first);
    expect(second.summary).toBe("Ship release");
  });

  it("decide transitions to approved and stamps decidedAt", async () => {
    const gate = createGate(createMemoryStateStore());
    await gate.require("deploy", "Ship release");
    const decided = await gate.decide("deploy", "approved");

    expect(decided.status).toBe("approved");
    expect(decided.decidedAt).toBeDefined();
  });

  it("decide can reject", async () => {
    const gate = createGate(createMemoryStateStore());
    await gate.require("deploy", "Ship release");
    const decided = await gate.decide("deploy", "rejected");
    expect(decided.status).toBe("rejected");
  });

  it("get reflects the current state", async () => {
    const gate = createGate(createMemoryStateStore());
    expect(await gate.get("deploy")).toBeNull();
    await gate.require("deploy", "Ship release");
    expect((await gate.get("deploy"))?.status).toBe("pending");
    await gate.decide("deploy", "approved");
    expect((await gate.get("deploy"))?.status).toBe("approved");
  });

  it("decide on an unknown id throws", async () => {
    const gate = createGate(createMemoryStateStore());
    await expect(gate.decide("ghost", "approved")).rejects.toThrow(/unknown approval request/);
  });
});
