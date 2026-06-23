# Delta: API Deprecation Rollout Loop

**Change ID:** `add-api-deprecation-rollout`

## ADDED

> Source of truth. Established by change `add-api-deprecation-rollout` (2026-06-23).

## Requirements

### Requirement: Staged, resumable deprecation rollout

The api-deprecation-rollout loop drives an API deprecation across long-horizon stages on `runPlan` (announce → grace-period → verify-callers → approve-removal → remove), persisting progress under `plan:<planId>` in the `StateStore`. It waits out a grace period, drains remaining callers, and removes the API only after a human approves the gate.

#### Scenario: Grace period
- GIVEN the current time is before the grace deadline
- WHEN the plan advances
- THEN it stays waiting at the grace-period step (the deprecation notice already emitted)

#### Scenario: Callers remain
- GIVEN the grace period elapsed but callers still use the API
- WHEN the plan advances
- THEN it stays waiting at verify-callers and re-checks on the next run

#### Scenario: Removal gated
- GIVEN callers have drained to zero and the removal gate is pending
- WHEN the plan advances
- THEN it blocks on the `<planId>:approve-removal` gate and removes nothing

#### Scenario: Removal approved
- GIVEN a human approves the removal gate
- WHEN the plan advances
- THEN it completes and emits the removal change set
