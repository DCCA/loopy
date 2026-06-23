# Runbook Freshness Loop Specification

> Source of truth. Established by change `add-runbook-freshness` (2026-06-23).

## Requirements

### Requirement: Detection & Report

The runbook-freshness loop flags runbooks past their review interval and writes a health report PR.

#### Scenario: Work needed
- GIVEN a runbook's last-reviewed date is older than the review interval
- WHEN the loop's detect phase runs
- THEN it reports work needed and identifies the affected items

#### Scenario: Clean
- GIVEN no such condition
- WHEN detect runs
- THEN it reports no work needed and produces no PR
