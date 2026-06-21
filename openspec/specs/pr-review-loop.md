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
