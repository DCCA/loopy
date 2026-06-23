# Delta: Codemod-Campaign Loop

**Change ID:** `add-codemod-campaign`
**Affects:** `loops/codemod-campaign/`

## ADDED

## Requirements

### Requirement: Throttled, Resumable Campaign

`advanceCampaign` drives a codemod across the codebase in batches of PRs,
tracked in a durable ledger and reconciled against real PR state each run,
advancing at most one batch per call.

#### Scenario: Pilot gate before any PRs
- GIVEN a campaign with no approved pilot batch
- WHEN it is advanced
- THEN it blocks on the pilot approval gate and opens no PR until approved

#### Scenario: Throttle at the open-PR cap
- GIVEN open batch PRs at `maxOpenPrs`
- WHEN it is advanced
- THEN it waits without opening another batch

#### Scenario: Reconcile against PR state
- GIVEN an open batch PR that has since merged
- WHEN it is advanced
- THEN that batch's files become migrated (a closed PR returns its files to the pool)

#### Scenario: Completion
- GIVEN no remaining targets and no open batches
- WHEN it is advanced
- THEN it reports completed

#### Scenario: Failed batch opens no PR
- GIVEN the codemod batch fails the test/build runner
- WHEN it is advanced
- THEN no PR is opened and the failure is recorded
