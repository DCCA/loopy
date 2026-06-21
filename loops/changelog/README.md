# changelog loop

Generates a `CHANGELOG.md` entry from unreleased commits and opens a PR. Fully
deterministic: it parses Conventional Commits and groups them into sections — no
AI required.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | Weekly schedule or manual dispatch |
| **detect** | List commits since the last tag; work needed if any exist |
| **act** | Parse + group commits, render an entry, prepend to `CHANGELOG.md` |
| **output** | One PR; existing entries preserved |
| **guardrails** | Allowlist `CHANGELOG.md`, `maxFiles: 1`, `skipIfOpenPr` |

## Configuration (`loop.yaml`)

- `changelogPath` — file to update (default `CHANGELOG.md`)

## Boundary

The commit source is injected as `services.commits` (`createGitCommitProvider`
by default), so the loop is testable and not tied to a specific VCS layout.

## Sections

`feat → Features`, `fix → Bug Fixes`, `perf → Performance`, `refactor`, `docs`,
`test`, `build`, `ci`, `chore`, and everything else under `Other`. Commits
marked breaking (`type!: …`) are also listed under **BREAKING CHANGES**.
