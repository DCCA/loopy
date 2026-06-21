# Dependency Updates Playbook

This loop is **deterministic** — it needs no AI step. It reads the package
manifest, compares each dependency to the registry's latest version, and opens a
single grouped PR bumping the safe (non-major) updates.

## Behavior

1. **detect** — parse `package.json` (`dependencies`, and `devDependencies` when
   `includeDev`), query the registry for each latest version, and compute
   updates. Work is needed only if at least one applicable (non-major, unless
   `allowMajor`) update exists.
2. **act** — bump the version ranges in `package.json`, preserving the existing
   `^`/`~` prefix, and emit a single change set.
3. **output** — one PR; major updates are listed in the body but not applied.

## Guardrails

- Allowlist is `package.json` only; `maxFiles: 1`.
- `skipIfOpenPr` avoids stacking duplicate update PRs.
- Per-dependency failures (registry error, unparseable range) are skipped, never
  aborting the run or producing a partial change.

## Optional AI enhancement

An AI step could be layered on later to summarize release notes or assess
breaking-change risk for the skipped majors, but it is intentionally not part of
the core deterministic loop.
