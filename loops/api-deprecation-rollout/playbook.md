# API Deprecation Rollout Playbook

Roll out an API deprecation across long-horizon stages, gated on a grace period,
caller telemetry, and a human approval. The telemetry boundary
(`remainingCallers`) is injected; the loop handles the announce, the long
WAIT, the caller drain, the human gate, and the removal change set.

## Behavior

1. **announce** — write the deprecation notice for the API (`result.notice`).
2. **grace-period** — a long-horizon **WAIT**: stay `waiting` until `now`
   reaches `graceUntilIso`. Resumable across restarts.
3. **verify-callers** — re-check telemetry; stay `waiting` until
   `remainingCallers()` drains to 0.
4. **approve-removal** — a human reviews and approves at the gate before any
   removal.
5. **remove** — on approval, emit the removal note (`result.removal`) for a
   reviewable PR; on rejection, hold (no removal).

## Guardrails (enforced)

- Removal is **never** automatic — it is human-gated.
- **Never remove an API while callers remain.** The drain step blocks on live
  telemetry until zero callers are observed.
- Resumable: the long grace WAIT, the caller drain, and the approval all survive
  restarts via the `StateStore` (`plan:<planId>`).
