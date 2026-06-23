# Delta: Test Impact Budget Loop

**Change ID:** `add-test-impact-budget`

## ADDED

> Source of truth. Established by change `add-test-impact-budget` (2026-06-23).

## Requirements

### Requirement: Stateful runtime regression detection

The test-impact-budget loop tracks per-test runtime against an EWMA baseline in the durable `StateStore`, flags tests that grew past a growth threshold, writes a report PR, and rolls the baseline forward.

#### Scenario: Regression
- GIVEN a test with a stored baseline whose latest duration exceeds `baseline * (1 + growthThreshold)`
- WHEN the loop's detect phase runs
- THEN it reports work needed and identifies the affected tests

#### Scenario: First-seen test
- GIVEN a test with no baseline entry
- WHEN detect runs
- THEN it is not a regression and the baseline seeds from the first observation

#### Scenario: Baseline roll-forward
- GIVEN the loop acts
- THEN the baseline is updated by EWMA (`alpha`) and persisted for the next run
