# dep-major-migration loop

Migrate **one** major dependency bump at a time — the kind `dep-updates`
deliberately skips — behind a **build/test gate** and a **human gate**. A
long-horizon loop on the `longrun` primitives: it verifies the consumer against
the candidate version, then proposes the manifest bump **only after human
approval**.

Programmatic (like the model-upgrade migration): `advanceDepMajorMigration(...)`
runs a resumable plan and pauses at the approval gate.

## Why one major at a time

Batch major bumps are the riskiest change a dependency bot can make: a single
breaking change is hard enough to diagnose, and a batch turns a red build into a
guessing game. This loop is the antidote — it isolates a single `pkg
fromVersion → toVersion` migration so verification points at exactly one cause.

## The plan

```
verify → approve (gate, only if green) → apply
```

| Step | What happens |
|------|--------------|
| **verify** | Build/test the consumer against the candidate version → `{ ok, log }` |
| **approve** | If the build is red, **hold** immediately (never gated, never proposed). If green, **blocked** until a human approves the bump |
| **apply** | On approval, emit the manifest bump (`result.bump`); on rejection or a red build, hold |

**Verify before gate**: a red build is never proposed. The approve step short-
circuits to `decision: "hold"` without ever calling the gate, and the `log` is
surfaced on `result.log` for triage.

## Boundaries (injected, testable)

- `services.verify(pkg, version)` — builds/tests the consumer against the
  candidate version → `VerifyResult { ok, log }`
- `readManifest()` — returns the current `package.json` text to bump
- a `StateStore` carries plan progress under `plan:<planId>`; the gate is
  created from it

## Resumability

Progress persists under `plan:<planId>` in the `StateStore`. Call
`advanceDepMajorMigration` repeatedly with the same `planId` + `store`: a long
verify or a pending approval survives restarts and resumes from the gate.

## Status

Programmatic — not wired into the CLI. `result.bump` is a `FileChange[]` (the
manifest change set); a caller/adapter opens it as a PR.
