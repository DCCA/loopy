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
- **output** — a reviewable **pull request** (safe, reversible)
- **guardrails** — path allowlist, max-files cap, idempotency, approvals

The runner is loop-agnostic and **fails safe**: on any error (including a
guardrail violation) it produces no output and never partially applies changes.

## Loops

| Loop | What it does | Status |
|------|--------------|--------|
| [`auto-docs`](loops/auto-docs/README.md) | Opens a PR to update docs when the code surface drifts | ✅ implemented |

More candidates are catalogued in
[`openspec/research/loop-use-cases.md`](openspec/research/loop-use-cases.md).

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

## Using a loop

See [`loops/auto-docs/README.md`](loops/auto-docs/README.md) and
[`loops/auto-docs/example.github-workflow.yml`](loops/auto-docs/example.github-workflow.yml)
for a consumer setup.

## License

MIT
