# Test Coverage Backfill Playbook

This playbook drives the **act** phase — the AI step that writes tests for
changed lines lacking coverage. The loop framework finds the gaps, runs the
self-validation gate, and opens the PR.

The generator is supplied as `services.generator` (see `index.ts`). It receives
the coverage gaps and returns test file changes.

## Instructions

1. **Cover the gap, nothing more.** Write focused tests that exercise the
   uncovered changed lines. Do not modify production code.
2. **Write meaningful assertions** — tests that would fail if the behavior
   regressed. Avoid assertion-free "coverage theater".
3. **Only touch test files** (the loop's allowlist enforces this).
4. **Return file changes**; return nothing if you cannot produce useful tests.

## Self-validation gate (enforced by the loop, not optional)

Generated tests are proposed **only if** the suite passes with them applied
**and** coverage increases. Otherwise the loop produces no output. The PR is
always human-reviewed for assertion quality.
