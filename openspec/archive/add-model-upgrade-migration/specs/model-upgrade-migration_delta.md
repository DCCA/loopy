# Delta: Model-Upgrade Migration Loop

**Change ID:** `add-model-upgrade-migration`
**Affects:** `loops/model-upgrade-migration/`

## ADDED

## Requirements

### Requirement: Gated Model Migration

The loop advances `baseline → candidate → diff → approve → apply`, evaluating a
golden set on the current and candidate models and proposing the model-id bump
only after human approval.

#### Scenario: Diff and gate
- GIVEN a current and a candidate model with a golden eval set
- WHEN the migration is advanced
- THEN it records both scorecards, computes regressions + score delta, and blocks at the approval gate

#### Scenario: Approved switch
- GIVEN the approval gate is approved
- WHEN the migration is advanced
- THEN it completes and emits the model-id bump change set

#### Scenario: Rejected switch
- GIVEN the approval gate is rejected
- WHEN the migration is advanced
- THEN it completes holding the current model and emits no bump
