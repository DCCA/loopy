# Delta: Changelog Loop

**Change ID:** `add-changelog-loop`
**Affects:** `loops/changelog/`, loop catalog

---

## ADDED

### Requirement: Unreleased Commit Detection

The changelog loop collects commits made since the last release and determines
whether a changelog entry is needed.

#### Scenario: Unreleased commits exist
- GIVEN there are commits since the last tag
- WHEN the loop's detect phase runs
- THEN it reports work needed

#### Scenario: Nothing unreleased
- GIVEN there are no commits since the last tag
- WHEN detect runs
- THEN it reports no work needed and produces no PR

---

### Requirement: Conventional Changelog Rendering

The loop parses Conventional Commits, groups them into sections, and prepends a
rendered entry to `CHANGELOG.md` without discarding existing content.

#### Scenario: Commits grouped by type
- GIVEN unreleased commits of types `feat` and `fix`
- WHEN the loop acts
- THEN the rendered entry lists them under "Features" and "Bug Fixes"

#### Scenario: Existing changelog preserved
- GIVEN a `CHANGELOG.md` already exists
- WHEN the loop acts
- THEN the new entry is prepended and prior entries remain

---

## MODIFIED

(None)

## REMOVED

(None)
