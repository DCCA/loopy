# data-contract-guard loop

Guards a **data contract** — a schema expressed as a set of named fields —
against breaking changes. On every pull request it diffs the current schema
against the last-**approved** baseline stored in the durable `StateStore`.
Additive changes are absorbed silently; breaking changes are **blocked behind a
human Gate**.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | `pull_request` event |
| **detect** | Load the baseline from state, diff against the current schema; work needed if there is no baseline or any change |
| **act** | No baseline → record it. Additive-only → record the new baseline (comment). Breaking → blocking comment + human Gate; a PR records the new baseline only after approval |
| **output** | A comment in every case except the gated acceptance, which is a PR writing the baseline file |
| **guardrails** | Allowlist `contracts/**`, `maxFiles: 5`, `skipIfOpenPr` |

Fully deterministic (no AI). The schema is read through the injected
`services.source` boundary; the baseline lives in `services.state`.

## Breaking vs additive

A change is **breaking** unless it is purely additive:

- a **removed** field — `removed`
- a field whose **type changed** — `type-changed`
- a **new required** field (old clients won't send it) — `required-added`

The one **additive** change is a **new optional** field — `added`. Additive-only
change sets move the baseline automatically; any breaking change requires a
person.

## The human Gate

Breaking changes call `gate.require("data-contract:accept", …)` (a `createGate`
checkpoint backed by the StateStore). Until someone runs
`gate.decide("data-contract:accept", "approved")` the loop only posts a blocking
comment and the baseline is never moved. On approval the next run opens a PR that
writes `contracts/schema.json` and persists the new baseline.

## Anti-pattern: bypassing the gate

Do **not** auto-approve the acceptance gate, widen "additive" to include
type-narrowing, or let the loop move the baseline on breaking changes without a
human decision. The gate is the whole point: it forces a person to acknowledge
that downstream consumers may break before the contract advances.
