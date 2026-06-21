# Proposal: PR Review Loop

**Change ID:** `add-pr-review-loop`
**Created:** 2026-06-21
**Status:** Planned

---

## Problem Statement

- PRs wait on human reviewers; obvious issues and missing context slow merges.
- An advisory AI reviewer that summarizes diffs and flags problems has the
  highest-frequency trigger (every PR) and zero blast radius (comment-only).

## Proposed Solution

Add `loops/pr-review/`: on a PR event, fetch the diff, run an AI reviewer
(injected), and post a **review comment** (summary + flagged issues). Advisory
only — never auto-merges or auto-closes on the model's verdict.

## Required Framework Extension

The current contract outputs `FileChange[] → pull request`. PR review outputs a
**comment**, not a file change. This change must first extend the output model
with a non-file output channel (e.g. `OutputKind: "pull-request" | "comment"`)
and add a `postComment` capability to the GitHub adapter. That extension is the
first phase of this proposal.

## Scope

### In Scope
- Output-channel extension (comment output) in core + GitHub adapter
- `pr-review` loop: diff provider boundary + AI reviewer boundary (both injected)
- Advisory comment output; tests with mocked diff + reviewer + client

### Out of Scope
- Auto-merge / auto-approve; inline per-line comments (later enhancement)
- Learning from team feedback

## Success Criteria

- [ ] Core supports a comment output channel without breaking PR-output loops.
- [ ] On a PR event, the loop posts one advisory review comment.
- [ ] The loop never merges, approves, or closes a PR.
- [ ] Diff and reviewer boundaries are covered by tests with injected fakes.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI false positives | Med | Low | Advisory only; clearly labeled as automated |
| Output-model churn | Med | Med | Add channel additively; keep file→PR path unchanged |
