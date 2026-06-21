# test-coverage loop

Backfills tests for changed lines that lack coverage and opens a PR — but only
when the generated tests **pass and raise coverage**. The artifact is
self-validating, which keeps the loop honest.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | Weekly schedule or manual dispatch |
| **detect** | Intersect changed lines with uncovered lines → gaps; work needed if any |
| **act** | AI generates tests for the gaps; validate; propose only if passing + coverage rose |
| **output** | One PR adding tests (allowlisted to test files), else nothing |
| **guardrails** | Allowlist test paths, `maxFiles`, `skipIfOpenPr` |

## Boundaries (injected, testable)

- `services.coverage` — coverage report + changed-lines source
- `services.generator` — the AI test-writing step
- `services.validate` — runs the suite and reports pass + coverage delta

## Fail-safe

If the generator produces nothing, or the validation gate fails (suite red or
coverage flat), the loop produces **no PR**.
