# scripts

## `dogfood.mjs` — exercise every loop with real example inputs

```bash
npm run build && npm run dogfood
```

A self-contained harness that runs **all 26 loops** end-to-end and prints a
pass/fail table. It is loopy dogfooding itself: proof that every loop's full
pipeline (`detect → act → guardrails → runner`) works on realistic inputs.

How each loop is driven:

- **CLI-wired loops** run through the real `run()` entrypoint in **dry-run**
  mode (so `detect → act → guardrails` execute exactly as in production; only
  the GitHub publish step is skipped). External boundaries are supplied as
  injected fakes (AI client, registry, diff, metric/incident/usage sources …)
  or as small fixture JSON files written to a temp dir. The harness asserts each
  loop produces the expected artifact — a PR change set, an advisory comment, or
  a gated/blocked state.
- **Gated loops** (`data-contract-guard`, `cost-guardrail`) are driven through
  both halves: the blocking comment, then — after approving the gate — the PR.
- **Catalogued-but-not-yet-wired loops** (`test-coverage`,
  `security-remediation`) are asserted to return their setup guidance.
- **Export-only long-horizon loops** (`experiment`, `codemod-campaign`,
  `model-upgrade-migration`, `api-deprecation-rollout`, `dep-major-migration`)
  are driven through their full `advance*` lifecycles against a memory state
  store: gate → approve → emit.

No network, no secrets, no real PRs. It exits non-zero if any loop fails, so CI
(`.github/workflows/dogfood.yml`) runs it on every push and pull request.
