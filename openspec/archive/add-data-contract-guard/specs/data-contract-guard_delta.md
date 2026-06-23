# Delta: Data Contract Guard Loop

**Change ID:** `add-data-contract-guard`

## ADDED

> Source of truth. Established by change `add-data-contract-guard` (2026-06-23).

## Requirements

### Requirement: Gated breaking-change detection

The data-contract-guard loop diffs the current schema against the last-approved baseline in the `StateStore`. Additive changes auto-record the new baseline; breaking changes post a blocking comment and require a human `Gate` before a PR records the new baseline.

#### Scenario: No baseline
- GIVEN no stored baseline
- WHEN the loop acts
- THEN it records the current schema as the baseline and comments

#### Scenario: Additive change
- GIVEN only new optional fields vs the baseline
- WHEN the loop acts
- THEN it auto-records the new baseline and comments (non-blocking)

#### Scenario: Breaking change blocked
- GIVEN a removed field, type change, or new required field
- WHEN the loop acts and the gate is not approved
- THEN it posts a blocking comment and leaves the baseline unchanged

#### Scenario: Breaking change accepted
- GIVEN the human approves the `data-contract:accept` gate
- WHEN the loop re-runs
- THEN it opens a PR writing the baseline file and persists the new baseline
