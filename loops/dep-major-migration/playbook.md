# Dep Major Migration Playbook

Migrate a single major dependency bump safely, gated on a real build/test run
and a human approval. The verifier and manifest reader are the injected
boundaries; the loop handles the ordering, the human gate, and the manifest bump.

## Why one major at a time

This loop handles exactly the bumps that batch dependency updates skip: breaking
majors. Batching majors compounds risk — one red build could stem from any of
several breaking changes. Migrating one major per plan keeps the cause
unambiguous and the revert trivial.

## Behavior

1. **verify** — build and test the consumer against the candidate version,
   capturing `{ ok, log }`.
2. **approve** — verify before gate:
   - If the build is **red** (`ok !== true`), **hold** immediately. The gate is
     never requested and the bump is never proposed; the `log` is surfaced for
     triage.
   - If the build is **green**, **block** at a human gate
     (`<planId>:approve`) until a person approves the bump.
3. **apply** — on approval, read the current manifest and emit the
   `^toVersion` bump as a `FileChange[]` (`result.bump`); on rejection, hold.

## Guardrails (enforced)

- A red build is **never** proposed — verification precedes the gate.
- The bump is **never** automatic — it is human-gated on a green build.
- One major bump per plan; `pathAllowlist` limits writes to `package.json` and
  `maxFiles: 1`.
- Resumable: a long verify or a pending approval survives restarts via the
  `StateStore` (`plan:<planId>`).

## Output

`result.bump` is the manifest change set (a `FileChange[]`). A caller/adapter
opens it as a reviewable PR; this loop does not push.
