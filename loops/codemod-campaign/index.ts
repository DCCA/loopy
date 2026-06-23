import { createGate, type Gate, type StateStore } from "../../src/core/index.js";
import {
  campaignTotal,
  emptyLedger,
  reconcile,
  remainingTargets,
  renderBurndown,
  selectBatch,
  type CampaignLedger,
  type CampaignPrs,
  type CampaignSpec,
  type Codemod,
  type TargetSource,
  type TestRunner,
} from "./hooks/campaign.js";

export type {
  Codemod,
  TargetSource,
  TestRunner,
  CampaignPrs,
  CampaignLedger,
  CampaignSpec,
  OpenBatch,
  PrState,
} from "./hooks/campaign.js";
export {
  emptyLedger,
  remainingTargets,
  selectBatch,
  reconcile,
  renderBurndown,
  campaignTotal,
} from "./hooks/campaign.js";

export interface CampaignServices {
  codemod: Codemod;
  targets: TargetSource;
  runner: TestRunner;
  prs: CampaignPrs;
}

export type CampaignStatus =
  | "completed"
  | "waiting"
  | "blocked"
  | "failed"
  | "batch-opened";

export interface CampaignResult {
  campaignId: string;
  status: CampaignStatus;
  reason?: string;
  gateId?: string;
  pr?: { number: number };
  ledger: CampaignLedger;
  burndown: string;
}

/**
 * Advance a codemod campaign by at most one batch. Resumable and idempotent:
 * the ledger (in the StateStore) is reconciled against real PR state every run,
 * batches are throttled by `maxOpenPrs`, and the pilot batch is human-gated.
 *
 * Call repeatedly (e.g. on a schedule). Returns:
 * - `completed`    — nothing left and no open batches
 * - `waiting`      — throttled (open-PR cap) or batches in flight, nothing to do now
 * - `blocked`      — awaiting the pilot-batch approval gate
 * - `failed`       — the batch failed tests/build (no PR opened)
 * - `batch-opened` — a new batch PR was opened
 */
export async function advanceCampaign(
  campaignId: string,
  spec: CampaignSpec,
  services: CampaignServices,
  store: StateStore,
  options?: { now?: () => Date; gate?: Gate },
): Promise<CampaignResult> {
  const now = options?.now ?? (() => new Date());
  const gate = options?.gate ?? createGate(store, options);
  const key = `campaign:${campaignId}`;

  let ledger = (await store.load<CampaignLedger>(key)) ?? emptyLedger();
  ledger = await reconcile(ledger, services.prs);

  const all = await services.targets.targets();
  const dateIso = now().toISOString().slice(0, 10);
  const done = (status: CampaignStatus, extra: Partial<CampaignResult> = {}) => ({
    campaignId,
    status,
    ledger,
    burndown: renderBurndown(all, ledger, dateIso),
    ...extra,
  });

  const remaining = remainingTargets(all, ledger);

  // Completion: nothing left and nothing in flight.
  if (remaining.length === 0 && ledger.open.length === 0) {
    await store.save(key, ledger);
    return done("completed");
  }
  // Throttle: at the open-PR cap.
  if (ledger.open.length >= spec.maxOpenPrs) {
    await store.save(key, ledger);
    return done("waiting", { reason: "open-PR cap reached" });
  }
  // Nothing selectable now, but batches are still in flight.
  if (remaining.length === 0) {
    await store.save(key, ledger);
    return done("waiting", { reason: "batches in flight" });
  }

  const batch = selectBatch(remaining, spec.batchSize);
  const changes = await services.codemod(batch);

  const test = await services.runner();
  if (!test.ok) {
    ledger = { ...ledger, failedBatches: ledger.failedBatches + 1 };
    await store.save(key, ledger);
    return done("failed", { reason: test.diagnostics ?? "batch failed tests/build" });
  }

  // Pilot gate: review the codemod's shape once, before opening any PRs.
  if (!ledger.pilotApproved) {
    const gateId = `${campaignId}:pilot`;
    const req = await gate.require(
      gateId,
      `Approve the pilot batch of campaign "${campaignId}" (${batch.length} file(s); ` +
        `${campaignTotal(all, ledger)} total).`,
    );
    if (req.status === "pending") {
      await store.save(key, ledger);
      return done("blocked", { gateId });
    }
    if (req.status === "rejected") {
      await store.save(key, ledger);
      return done("blocked", { gateId, reason: "pilot batch rejected" });
    }
    ledger = { ...ledger, pilotApproved: true };
  }

  const n = ledger.batchesOpened + 1;
  const branch = `loopy/campaign-${campaignId}-${n}`;
  const burndown = renderBurndown(all, ledger, dateIso);
  const pr = await services.prs.open({
    branch,
    title: `${spec.title} (batch ${n})`,
    body: burndown,
    changes,
  });

  ledger = {
    ...ledger,
    batchesOpened: n,
    open: [...ledger.open, { prNumber: pr.number, branch, files: batch }],
  };
  await store.save(key, ledger);
  return done("batch-opened", { pr });
}
