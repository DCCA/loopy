# Project Context

## Overview

**loopy** is a library of reusable **automation loops** that software teams import
into their own repositories. A "loop" is a recurring, semi-autonomous task that
keeps some part of a codebase healthy with little manual effort — for example,
keeping documentation in sync with the code.

Loopy is designed to be **imported by other projects**. It ships loops with sane
defaults and light customization, plus a small framework so a *team* can adopt a
loop without wiring it from scratch. The first loop is **auto-docs** (keep repo
documentation up to date with the code).

### The loop contract

Every loop, regardless of how smart its internals are, follows one contract:

```
trigger → detect → act → output → guardrails
```

- **trigger** — cron schedule, repo event (PR/push), or manual run
- **detect** — decide whether there is work to do (e.g. docs drifted from code)
- **act** — perform the work; may be an AI/agent step, deterministic code, or both
- **output** — almost always a reviewable **pull request** (safe, reversible)
- **guardrails** — scope limits, idempotency, max-change caps, approval gates

### Packaging

Each loop is a self-contained folder:

```
loops/<loop-name>/
  loop.yaml      # manifest: trigger, inputs, guardrails
  playbook.md    # agent instructions / steps for the `act` phase
  hooks/         # optional deterministic code steps
```

Loopy provides a small **runner** plus **adapters** so one loop can run in
multiple environments:

- **GitHub Action adapter** — universal for repo automation (scheduled / on-event)
- **Claude Code skill adapter** — drop-in for on-demand / interactive runs

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript (Node.js, ESM) |
| Package manager | npm (published package, importable by others) |
| Loop manifest | YAML (`loop.yaml`) |
| Agent step | Claude (Anthropic) via the loop playbook |
| Runtimes | GitHub Actions adapter, Claude Code skill adapter |
| Testing | Vitest (TBD — confirm on first implementation) |

> Tech choices are the recommended default and may be revised in the first
> implementation proposal.

## Architecture

A small core framework defines the loop contract and runner; loops are pluggable
folders; adapters bind a loop to a runtime.

```
loopy/
├── src/
│   ├── core/          # loop contract types, runner, guardrails
│   └── adapters/      # github-action, claude-code-skill
├── loops/             # the catalog (auto-docs is loop #1)
│   └── auto-docs/
│       ├── loop.yaml
│       ├── playbook.md
│       └── hooks/
├── openspec/          # spec-driven development workflow
└── .claude/skills/    # OpenSpec skills + (future) loop skill adapters
```

## Coding Conventions

### Naming
- Files: `kebab-case.ts`
- Types / classes: `PascalCase`
- Variables / functions: `camelCase`
- Loop IDs and change IDs: `kebab-case`

### Error Handling
- Loops must fail safe: on error, produce no output (no PR) rather than a wrong one.
- Surface errors clearly in the run log; never partially apply a change.

### Testing
- Each loop has unit tests for its `detect` logic and any deterministic `hooks`.
- Core runner and adapters are unit tested.

## Quality Gates

Before any commit:
```bash
# To be finalized with the first implementation proposal:
npm run lint
npm run typecheck
npm test
```

## Key Principles

1. **PR-first, fail-safe.** A loop's output is a reviewable PR; when unsure, do nothing.
2. **One loop, one job.** Each loop solves a single recurring problem well.
3. **Portable contract.** Every loop follows `trigger → detect → act → output → guardrails` and runs in any supported adapter.
4. **Team-friendly defaults.** Loops work out of the box with light, documented customization.
5. **Guardrails by default.** Scope limits, idempotency, and approval gates are first-class, not afterthoughts.
