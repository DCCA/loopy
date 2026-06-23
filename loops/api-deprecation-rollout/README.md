# api-deprecation-rollout loop

Roll out an API deprecation across **long-horizon stages**, gated on a grace
period, caller telemetry, and a human removal approval. A long-horizon loop on
the `longrun` primitives: it announces the deprecation, waits out the grace
period, re-checks that callers have drained, and proposes the removal **only
after human approval**.

Programmatic (like the model-upgrade migration): `advanceApiDeprecation(...)`
runs a resumable plan and pauses at the grace WAIT, the caller-drain re-check,
and the removal gate.

## The plan

```
announce → grace-period (WAIT) → verify-callers (drain) → approve-removal (gate) → remove
```

| Step | What happens |
|------|--------------|
| **announce** | Emit the deprecation notice (`result.notice`) for `noticePath` |
| **grace-period** | **waiting** until `now >= graceUntilIso` (a long-horizon WAIT) |
| **verify-callers** | **waiting** (re-runs) until `services.remainingCallers()` hits 0 |
| **approve-removal** | **blocked** until a human approves the removal |
| **remove** | On approval, emit the removal note (`result.removal`); on rejection, hold |

## Boundaries (injected, testable)

- `services.remainingCallers()` — telemetry boundary returning how many callers
  still use the API; the drain step re-checks until it reaches 0
- a `StateStore` carries plan progress (`plan:<planId>`); the gate is created
  from it

## Resumability

Plan progress is persisted under `plan:<planId>` in the `StateStore`. Calling
`advanceApiDeprecation` again with the same `planId` + store continues from the
grace WAIT, the caller-drain re-check, or the removal gate — surviving restarts
and the (potentially long) gap between announce and removal.

## Anti-pattern

Removing an API while callers remain. The `verify-callers` drain stays
**waiting** until telemetry reports zero callers, and removal is additionally
**human-gated**, so the loop cannot break live consumers.

## Status

Programmatic. `result.removal` is the removal change set; a CLI verb / PR adapter
to open it is a follow-up (shared with the model-upgrade migration).
