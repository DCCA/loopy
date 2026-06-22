# PR Review Loop Specification

> Source of truth. Established by change `add-pr-review-loop` (2026-06-21).
> Also introduces the core **comment output channel**.

## Requirements

### Requirement: Comment Output Channel

The loop framework supports producing a comment as output, in addition to a
pull request, without changing the behavior of file-change → PR loops.

#### Scenario: Comment output produced
- GIVEN a loop whose output is a comment
- WHEN the runner produces output and the adapter publishes it
- THEN a comment is posted and no branch or PR is created

---

### Requirement: Advisory PR Review

On a pull-request event, the pr-review loop posts a single advisory review
comment summarizing the diff and flagging issues, and never changes PR state.

#### Scenario: Review posted
- GIVEN a new or updated pull request with a non-empty diff
- WHEN the loop runs
- THEN it posts one advisory review comment

#### Scenario: Empty diff
- GIVEN a pull request with no changed files
- WHEN detect runs
- THEN it reports no work needed and posts no comment

#### Scenario: Never gates the PR
- GIVEN the AI reviewer flags issues
- WHEN the loop completes
- THEN it does not merge, approve, request changes, or close the PR

---

> Runtime added by change `add-pr-review-runtime` (2026-06-21).

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
