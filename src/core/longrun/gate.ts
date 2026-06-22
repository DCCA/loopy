import type { StateStore } from "./state.js";

/** Lifecycle of a human-approval checkpoint. */
export type ApprovalStatus = "pending" | "approved" | "rejected";

/** A single approval checkpoint, persisted in a {@link StateStore}. */
export interface ApprovalRequest {
  id: string;
  summary: string;
  status: ApprovalStatus;
  requestedAt: string;
  decidedAt?: string;
}

/**
 * A human-approval checkpoint primitive. A loop calls {@link Gate.require} to
 * register that it is waiting on a person; a human (or external system) later
 * calls {@link Gate.decide}. State is durable so a paused plan can resume once a
 * decision lands.
 */
export interface Gate {
  /** Idempotent: first call records a pending request; later calls return the current state. */
  require(id: string, summary: string): Promise<ApprovalRequest>;
  decide(id: string, status: "approved" | "rejected"): Promise<ApprovalRequest>;
  get(id: string): Promise<ApprovalRequest | null>;
}

/** Namespace gate requests so they don't collide with other StateStore keys. */
function keyFor(id: string): string {
  return `gate:${id}`;
}

/**
 * Create a {@link Gate} backed by a {@link StateStore}. A `now` clock can be
 * injected for deterministic tests.
 */
export function createGate(store: StateStore, options?: { now?: () => Date }): Gate {
  const now = options?.now ?? (() => new Date());

  return {
    async require(id: string, summary: string): Promise<ApprovalRequest> {
      const existing = await store.load<ApprovalRequest>(keyFor(id));
      // Idempotent: never overwrite an existing request (its status may have
      // already advanced past pending).
      if (existing) return existing;

      const request: ApprovalRequest = {
        id,
        summary,
        status: "pending",
        requestedAt: now().toISOString(),
      };
      await store.save(keyFor(id), request);
      return request;
    },

    async decide(id: string, status: "approved" | "rejected"): Promise<ApprovalRequest> {
      const existing = await store.load<ApprovalRequest>(keyFor(id));
      if (!existing) {
        throw new Error(`cannot decide unknown approval request "${id}"`);
      }
      const decided: ApprovalRequest = {
        ...existing,
        status,
        decidedAt: now().toISOString(),
      };
      await store.save(keyFor(id), decided);
      return decided;
    },

    async get(id: string): Promise<ApprovalRequest | null> {
      return store.load<ApprovalRequest>(keyFor(id));
    },
  };
}
