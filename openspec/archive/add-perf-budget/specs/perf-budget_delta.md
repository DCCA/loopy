# Delta: Performance Budget Loop

**Change ID:** `add-perf-budget`

## ADDED

## Requirements

### Requirement: Detection & Report

The perf-budget loop flags metrics that regress beyond tolerance vs a stored baseline and writes a report PR.

#### Scenario: Work needed
- GIVEN a measured metric exceeds its baseline by more than the tolerance
- WHEN the loop's detect phase runs
- THEN it reports work needed and identifies the affected items

#### Scenario: Clean
- GIVEN no such condition
- WHEN detect runs
- THEN it reports no work needed and produces no PR
