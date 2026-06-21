# Delta: PR Review Loop

**Change ID:** `add-pr-review-loop`
**Affects:** core output model, GitHub adapter, `loops/pr-review/`

---

## ADDED

### Requirement: Comment Output Channel

The loop framework supports producing a comment as output, in addition to a
pull request, without changing the behavior of file-change → PR loops.

#### Scenario: Comment output produced
- GIVEN a loop whose output is a comment
- WHEN the runner produces output and the adapter publishes it
- THEN a comment is posted and no branch or PR is created

### Requirement: Advisory PR Review

On a pull-request event, the pr-review loop posts a single advisory review
comment summarizing the diff and flagging issues, and never changes PR state.

#### Scenario: Review posted
- GIVEN a new or updated pull request
- WHEN the loop runs
- THEN it posts one advisory review comment

#### Scenario: Never gates the PR
- GIVEN the AI reviewer flags issues
- WHEN the loop completes
- THEN it does not merge, approve, request changes, or close the PR

## MODIFIED

(None)

## REMOVED

(None)
