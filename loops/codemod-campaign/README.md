# codemod-campaign loop

Drives a deterministic **codemod across a codebase in throttled batches of PRs**,
tracked to completion against a durable ledger. The flagship complex loop — it
uses all of loopy's long-horizon primitives: **`StateStore`** (the campaign
ledger), a human **`Gate`** (pilot-batch approval), and resumable advancement.

It is **not** a single-shot `Loop`; it advances a campaign via
`advanceCampaign(...)`, called repeatedly (e.g. on a schedule). Each call does at
most one batch, reconciles against real PR state first, and is idempotent.

## How it advances

| On each `advanceCampaign` | What happens |
|---------------------------|--------------|
| **reconcile** | Read each open batch PR's state; merged → files become `migrated`, closed → files return to the pool. External PR state is the source of truth. |
| **complete?** | No remaining targets and no open batches → `completed`. |
| **throttle?** | Open PRs ≥ `maxOpenPrs` → `waiting` (don't pile on). |
| **select** | Take the next `batchSize` remaining files. |
| **apply + test** | Run the codemod on the batch; run the test/build boundary. Red → `failed`, no PR. |
| **pilot gate** | The first batch is **blocked** on human approval (review the codemod's shape once). |
| **open** | Open a batch PR; record it in the ledger with its files. |

## Boundaries (injected, testable)

- `services.codemod(files)` — the pure transform → `FileChange[]`
- `services.targets.targets()` — files still needing the transform
- `services.runner()` — run tests/build after a batch
- `services.prs` — `open(...)` a batch PR and read `state(prNumber)`
- a `StateStore` carries the ledger across runs

## Guardrails / anti-patterns

- **Campaign runaway** → `maxOpenPrs` cap + one batch per run.
- **Stale state** → reconcile against real PR state every run; closed PRs return files to the pool.
- **Partial-rollout corruption** → only `migrated` on confirmed merge; failed batches open no PR.
- **Gate bypass** → no PRs open until the pilot batch is approved.

## Status

Programmatic for now (the `CampaignPrs` boundary is injected). A GitHub-backed
`CampaignPrs` adapter and a `loopy campaign` CLI verb are planned follow-ups.
