# api-deprecation-rollout — lifecycle transcript

Deprecating `v1.users.list`, grace period until 2026-12-01.

1. advance (before grace deadline) → **waiting** at `grace-period`; deprecation notice emitted
2. advance (after deadline, 3 callers remain) → **waiting** at `verify-callers` (won't remove while callers remain)
3. advance (callers drained to 0) → **blocked** at gate `dep:approve-removal`
4. human **approves** removal
5. advance → **completed**, decision `approved` — removal change emitted
