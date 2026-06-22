# Delta: PR Review Runtime

**Change ID:** `add-pr-review-runtime`
**Affects:** GitHub adapter, CLI `run`, workflow template

---

## ADDED

### Requirement: GitHub Diff Provider

The GitHub adapter can supply a pull request's diff for review.

#### Scenario: Fetch PR files
- GIVEN an owner, repo, token, and PR number
- WHEN the diff provider is asked for the diff
- THEN it returns the changed files as `{ path, patch }` from the GitHub API

---

### Requirement: Turnkey pr-review via the CLI

`loopy run pr-review` runs end-to-end when an AI key and a target PR number are
available, posting one advisory comment.

#### Scenario: Keyed run with a PR number
- GIVEN an AI key and a resolvable PR number
- WHEN the user runs `loopy run pr-review`
- THEN it reviews the PR diff and posts an advisory comment

#### Scenario: Missing PR number
- GIVEN no PR number can be resolved
- WHEN the user runs `loopy run pr-review`
- THEN it reports clear guidance instead of failing opaquely

---

### Requirement: Scaffold the PR Number

`loopy add` wires the PR number into event-triggered loop workflows.

#### Scenario: Add pr-review
- WHEN the user runs `loopy add pr-review`
- THEN the generated workflow sets `LOOPY_PR_NUMBER` from the pull request event

## MODIFIED

(None)

## REMOVED

(None)
