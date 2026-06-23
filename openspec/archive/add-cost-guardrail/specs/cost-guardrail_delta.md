# Delta: Cost Guardrail Loop

**Change ID:** `add-cost-guardrail`

## ADDED

> Source of truth. Established by change `add-cost-guardrail` (2026-06-23).

## Requirements

### Requirement: Stateful idle-streak tracking with gated remediation

The cost-guardrail loop tracks per-resource idle streaks in the durable `StateStore`. The streak advances on every run (the grace period). Once a resource is idle for `minStreak` consecutive observations the loop proposes a remediation report behind a human `Gate`. It never auto-deletes anything.

#### Scenario: Streak below threshold
- GIVEN an idle resource whose streak is below `minStreak`
- WHEN the loop runs
- THEN no work is produced but the streak is advanced and persisted

#### Scenario: Gated remediation
- GIVEN a resource idle for `minStreak` consecutive observations
- WHEN the loop acts and the gate is not approved
- THEN it posts a blocking comment and deletes nothing

#### Scenario: Approved remediation
- GIVEN the human approves the `cost-guardrail:remediate` gate
- WHEN the loop re-runs
- THEN it opens a report PR proposing decommissioning (no destructive action)

#### Scenario: Busy resource
- GIVEN a resource above the idle threshold
- WHEN the loop runs
- THEN its streak resets to zero and the gate is never requested
