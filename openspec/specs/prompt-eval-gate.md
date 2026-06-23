# Prompt-Eval Gate Loop Specification

> Source of truth. Established by change `add-prompt-eval-gate` (2026-06-23).

## Requirements

### Requirement: Baseline Regression Gate

The prompt-eval-gate loop scores an eval set through the model and compares it to
a baseline stored in the durable StateStore.

#### Scenario: Establish baseline
- GIVEN no stored baseline
- WHEN the loop runs
- THEN it records the current scorecard as the baseline and posts a comment

#### Scenario: Regression blocks
- GIVEN a case that passed in the baseline now fails
- WHEN the loop runs
- THEN it posts a blocking advisory comment and does not change the baseline

#### Scenario: Stable
- GIVEN no regressions and no improvement beyond tolerance
- WHEN the loop runs
- THEN it reports no work

---

### Requirement: Human-Gated Baseline Promotion

An improved scorecard promotes the baseline only after human approval.

#### Scenario: Improvement gated
- GIVEN the score improved beyond tolerance
- WHEN the loop runs without an approval
- THEN it posts a comment noting the improvement and leaves the baseline unchanged

#### Scenario: Promotion on approval
- GIVEN the promotion gate is approved
- WHEN the loop runs
- THEN it opens a PR writing the baseline file and persists the new baseline
