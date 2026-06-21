# Changelog Playbook

This loop is **deterministic** — no AI step. It collects unreleased commits,
groups them by Conventional Commit type, and prepends a rendered entry to
`CHANGELOG.md`.

## Behavior

1. **detect** — ask the commit provider for commits since the last release; work
   is needed only if at least one exists.
2. **act** — parse Conventional Commits (`feat`, `fix`, `perf`, …), group into
   sections, render an entry under the next version label, and prepend it to
   `CHANGELOG.md` (creating the file with a header if absent). Non-conventional
   commits are bucketed under "Other"; `!`-marked commits are surfaced under
   "BREAKING CHANGES".
3. **output** — one PR; existing changelog content is preserved.

## Guardrails

- Allowlist is `CHANGELOG.md` only; `maxFiles: 1`.
- `skipIfOpenPr` avoids stacking duplicate changelog PRs. After a release tag,
  `listUnreleased` returns empty, so the loop naturally goes quiet.

## Boundary

The commit source is injected as `services.commits` (see
`createGitCommitProvider`), keeping the loop testable and VCS-agnostic.
