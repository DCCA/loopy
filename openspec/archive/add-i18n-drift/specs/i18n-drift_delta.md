# Delta: i18n Drift Loop

**Change ID:** `add-i18n-drift`

## ADDED

## Requirements

### Requirement: Detection & Report

The i18n-drift loop flags translation keys missing from locales (and orphaned keys) and writes a status report PR.

#### Scenario: Work needed
- GIVEN a locale is missing a key present in the default locale
- WHEN the loop's detect phase runs
- THEN it reports work needed and identifies the affected items

#### Scenario: Clean
- GIVEN no such condition
- WHEN detect runs
- THEN it reports no work needed and produces no PR
