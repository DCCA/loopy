# codemod-campaign — lifecycle transcript

Campaign: migrate 4 files, batch size 2, pilot-gated.

1. advance → **blocked** on pilot gate `camp:pilot` (no PRs until approved)
2. human **approves** the pilot
3. advance → **batch-opened**, opened PR #1 for [a, b]
4. advance → **batch-opened**, opened PR #2
5. both PRs merged → advance → **completed**, migrated [a, b, c, d]
