# Accessibility Baseline Loop Specification

> Source of truth. Established by change `add-a11y-baseline` (2026-06-23).

## Requirements

### Requirement: Detection & Report

The a11y-baseline loop fails only on NEW accessibility violations vs a baseline and writes a report PR.

#### Scenario: Work needed
- GIVEN a violation appears that is not in the baseline
- WHEN the loop's detect phase runs
- THEN it reports work needed and identifies the affected items

#### Scenario: Clean
- GIVEN no such condition
- WHEN detect runs
- THEN it reports no work needed and produces no PR
