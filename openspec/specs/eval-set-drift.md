# Eval-Set Drift Loop Specification

> Source of truth. Established by change `add-eval-set-drift` (2026-06-23).

## Requirements

### Requirement: Stateful eval-coverage drift detection

The eval-set-drift loop compares production input categories against the categories covered by the eval/golden set, surfaces the uncovered ones as proposed new eval cases in a report PR, and records surfaced categories in the `StateStore` so each is reported only once.

#### Scenario: Uncovered category
- GIVEN a production category absent from the eval set and not yet surfaced
- WHEN the loop's detect phase runs
- THEN it reports work needed and identifies the uncovered categories

#### Scenario: Already surfaced
- GIVEN every uncovered category was surfaced in a prior run
- WHEN detect runs
- THEN it reports no work needed

#### Scenario: Fully covered
- GIVEN every production category is represented in the eval set
- WHEN detect runs
- THEN it reports no work needed
