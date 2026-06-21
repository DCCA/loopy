# Dependency Updates Loop Specification

> Source of truth. Established by change `add-dependency-updates-loop` (2026-06-21).

## Requirements

### Requirement: Dependency Update Detection

The dep-updates loop reads the package manifest and determines which
dependencies have a newer registry version, classifying each update as major,
minor, or patch.

#### Scenario: Outdated dependency found
- GIVEN a `package.json` dependency whose registry latest is newer
- WHEN the loop's detect phase runs
- THEN it reports work needed and identifies the dependency

#### Scenario: Everything up to date
- GIVEN all dependencies already match the latest non-major version
- WHEN detect runs
- THEN it reports no work needed and produces no PR

---

### Requirement: Grouped, Low-Risk Updates

The loop applies non-major updates in a single grouped pull request and excludes
major updates by default, preserving existing version-range prefixes.

#### Scenario: Non-major updates applied together
- GIVEN several dependencies have newer minor/patch versions
- WHEN the loop acts
- THEN it produces one change set bumping all of them, keeping `^`/`~` prefixes

#### Scenario: Major updates excluded by default
- GIVEN a dependency has a newer major version and `allowMajor` is false
- WHEN the loop acts
- THEN that dependency is not bumped but is reported in the PR summary
