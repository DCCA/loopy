# security-remediation loop

Opens **human-gated** PRs that fix security findings at or above a severity
threshold. Severity-driven (complements the freshness-driven `dep-updates`
loop), with false-positive filtering and never auto-merge.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | Daily schedule or manual dispatch |
| **detect** | Filter findings: not false-positive AND ≥ `severityThreshold`; work needed if any |
| **act** | Apply a fix per finding (dep bump or codemod/AI); merge change sets |
| **output** | One PR with the fixes for human review; unfixable findings listed |
| **guardrails** | Allowlist (`package.json`, `src/**`), `maxFiles`, `skipIfOpenPr` |

## Boundaries (injected, testable)

- `services.findings` — scanner findings source (SCA/SAST)
- `services.fixer` — produces remediation changes per finding (may reuse the
  `dep-updates` semver helpers for dependency bumps)

## Configuration (`loop.yaml`)

- `severityThreshold` — `low` | `medium` | `high` | `critical` (default `high`)

## Safety

Always human-reviewed; never auto-merged. Secret rotation is out of scope here
(belongs to an alert-first secret-leak loop).
