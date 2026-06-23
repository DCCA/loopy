# eval-set-drift loop

Detects when an eval/golden dataset has gone **stale** relative to production
inputs and proposes the gap as new eval cases. It compares the categories
present in the eval set against the categories observed in a recent production
sample, and reports the production categories with **no representation** in the
eval set.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | Weekly schedule (Mondays) or manual dispatch |
| **detect** | Compute uncovered categories; work needed if any are not yet surfaced |
| **act** | Record surfaced categories in state; write a report proposing the new cases |
| **output** | One report PR under `reports/` |
| **guardrails** | Allowlist `reports/**`, `maxFiles: 5`, `skipIfOpenPr` |

Fully deterministic (no AI). The two boundaries — the **eval set** categories
and the **production sample** categories — are injected as `services.source`
(a `DriftSource`). Detection is `uncovered(evalCategories, productionCategories)`:
both sides are normalized (lowercased, trimmed, whitespace collapsed), and the
result is the de-duplicated, sorted set of production categories absent from the
eval set.

## State (dedup)

The loop uses the `StateStore` under key `eval-set-drift:surfaced` to hold the
`string[]` of categories it has already surfaced. Each run reports only the
**fresh** uncovered categories (uncovered minus already-surfaced), then unions
the fresh set into the stored list during `act`. This prevents re-opening a PR
for the same gap on every weekly run — once a category is surfaced it stays
surfaced.

## Configuration (`loop.yaml`)

- `reportPath` — where the drift report is written (default `reports/eval-drift.md`)

## Anti-pattern: PII

Production samples frequently contain personally identifiable information. This
loop deliberately works at the **category** level and only ever writes category
labels into the report — never raw production rows. The generated report and PR
summary both carry a reminder to review the proposed cases for PII before adding
them to the eval set. Do not extend this loop to copy production payloads into
the repo.
