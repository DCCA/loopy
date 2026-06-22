# pr-review loop

Posts an **advisory** automated review comment on a pull request. It summarizes
the diff and flags issues — and never approves, requests changes, merges, or
closes. Highest-frequency trigger (every PR), zero blast radius.

This is loopy's first **comment-output** loop, using the core comment channel
rather than producing a pull request.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | `pull_request` event |
| **detect** | Fetch the diff; work needed if any files changed |
| **act** | An AI reviewer (`services.reviewer`, driven by `playbook.md`) returns a summary + issues |
| **output** | One advisory **comment** on the PR (via the comment channel) |
| **guardrails** | None on files (comment output); advisory by design |

## Boundaries

Both boundaries are injected and testable:

- `services.diff` — supplies the PR diff. `loopy run` wires the GitHub-backed
  `createGitHubDiffProvider` automatically.
- `services.reviewer` — the AI review step (OpenRouter by default).

## Turnkey via `loopy run`

`loopy add pr-review` scaffolds a `pull_request` workflow that sets
`OPENROUTER_API_KEY` and `LOOPY_PR_NUMBER` (from the event). `loopy run pr-review`
then fetches the diff, reviews it, and posts the comment — no extra wiring.

## Notes

Inline per-line comments, learning from team feedback, and auto-approval are
deliberately out of scope — the loop stays advisory.
