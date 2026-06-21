# loopy

A library of reusable **automation loops** that software teams import into their
repositories. A "loop" is a recurring, semi-autonomous task that keeps some part
of a codebase healthy with little manual effort — for example, keeping
documentation in sync with the code.

## The loop contract

Every loop follows one contract, regardless of how smart its internals are:

```
trigger → detect → act → output → guardrails
```

- **trigger** — cron schedule, repo event, or manual run
- **detect** — decide whether there is work to do (cheap/deterministic)
- **act** — do the work; an AI/agent step, deterministic code, or both
- **output** — a reviewable **pull request** (safe, reversible), or an advisory **comment**
- **guardrails** — path allowlist, max-files cap, idempotency, approvals

The runner is loop-agnostic and **fails safe**: on any error (including a
guardrail violation) it produces no output and never partially applies changes.

## Loops

| Loop | What it does | `act` | Output |
|------|--------------|-------|--------|
| [`auto-docs`](loops/auto-docs/README.md) | Updates docs when the code surface drifts | AI | PR |
| [`dep-updates`](loops/dep-updates/README.md) | One grouped PR bumping non-major dependency updates | deterministic | PR |
| [`changelog`](loops/changelog/README.md) | A changelog entry from unreleased commits | deterministic | PR |
| [`pr-review`](loops/pr-review/README.md) | An advisory automated review comment on a PR | AI | comment |
| [`test-coverage`](loops/test-coverage/README.md) | Backfills tests for uncovered changed lines (self-validating) | AI | PR |
| [`security-remediation`](loops/security-remediation/README.md) | Human-gated fixes for security findings above a threshold | hybrid | PR |

The "top 5 after auto-docs" shortlist is complete. See the
[roadmap](openspec/roadmap.md) for the backlog and the
[research catalog](openspec/research/loop-use-cases.md) for the full survey.

## Project layout

```
src/core/                  loop contract, runner, guardrails, manifest loader
src/adapters/github-action GitHub Action adapter + REST client + PR publishing
loops/<name>/              the catalog (loop.yaml + playbook.md + hooks/)
openspec/                  spec-driven development workflow (specs, changes, research)
```

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest
```

Requires Node.js >= 20.

## 1-click import

Import any loop into your repo with a single command — it scaffolds a
ready-to-run GitHub workflow wired to the loop's trigger, output, and secrets:

```bash
npx loopy add dep-updates     # scaffolds .github/workflows/loopy-dep-updates.yml
npx loopy list                # see all loops and what each needs
```

Commit the generated workflow and set the listed secrets (always `GITHUB_TOKEN`;
AI loops also need `ANTHROPIC_API_KEY`). The workflow runs `npx loopy run <loop>`,
which executes the loop and opens the PR/comment. Deterministic loops
(`dep-updates`, `changelog`) are turnkey; loops with an AI `act` step take an
injected provider (see the loop's README).

For a fully manual setup instead, see
[`loops/auto-docs/example.github-workflow.yml`](loops/auto-docs/example.github-workflow.yml).

## License

MIT
