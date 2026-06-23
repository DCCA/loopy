# Delta: Release-Train Loop

**Change ID:** `add-release-train-loop`
**Affects:** `loops/release-train/`, CLI catalog/run

---

## ADDED

### Requirement: Conventional Semver Bump

The release-train loop computes the next version from unreleased conventional
commits.

#### Scenario: Bump by commit type
- GIVEN unreleased commits including a breaking change, a feat, or only fixes
- WHEN detect runs
- THEN the next version is a major, minor, or patch bump respectively

#### Scenario: No releasable commits
- GIVEN no unreleased commits
- WHEN detect runs
- THEN no PR is produced

---

### Requirement: Release PR Output

The loop opens a PR bumping the manifest version and prepending a changelog
entry; merging it cuts the release.

#### Scenario: Release PR
- GIVEN releasable unreleased commits
- WHEN the loop acts
- THEN it writes the bumped `package.json` version and a new `CHANGELOG.md` entry

## MODIFIED

(None)

## REMOVED

(None)
