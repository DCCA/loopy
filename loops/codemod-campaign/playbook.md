# Codemod Campaign Playbook

This loop drives a **deterministic** codemod across a codebase as a staged,
throttled, ledger-tracked campaign of PRs. The transform itself is the injected
`codemod` boundary (jscodeshift/ts-morph/OpenRewrite-style); the loop handles
batching, throttling, reconciliation, the pilot gate, and burndown.

## The campaign contract

1. **Reconcile** the ledger against real PR state (merged/closed/open) — external
   state is the source of truth.
2. **Throttle**: never exceed `maxOpenPrs` concurrent batch PRs.
3. **Batch**: take the next `batchSize` files that still match the predicate.
4. **Apply + verify**: run the codemod, then the test/build boundary; a red batch
   opens no PR.
5. **Pilot gate**: a human approves the first batch (the codemod's shape) before
   any PRs are opened.
6. **Open** a batch PR and record it in the ledger; repeat on the next run.

## Designing the codemod (the injected boundary)

- Make it **idempotent** — re-running on the same file must be a no-op.
- Keep batches **small and reviewable**; one concern per campaign.
- The transform must leave the tree **green** (the runner gates this).

## Guardrails (enforced, not optional)

- Open-PR cap + one batch per run (no runaway).
- Reconcile every run; closed PRs return their files to the pool.
- Files become "migrated" only when their batch PR is **merged**.
- No PRs until the pilot batch is approved at the Gate.
