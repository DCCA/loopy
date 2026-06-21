# Delta: loopy CLI

**Change ID:** `add-loopy-cli`
**Affects:** package `bin`, `src/cli/`

---

## ADDED

### Requirement: 1-Click Loop Import

A single CLI command scaffolds a ready-to-run workflow for a loop into the
consumer's repository.

#### Scenario: Add a loop
- GIVEN a repository and a known loop id
- WHEN the user runs `loopy add <loop>`
- THEN a ready-to-run workflow is written to `.github/workflows/loopy-<loop>.yml`
  matching the loop's trigger, output, and required secrets

#### Scenario: Unknown loop
- GIVEN an unknown loop id
- WHEN the user runs `loopy add <loop>`
- THEN the command fails with a helpful message listing available loops

---

### Requirement: Catalog Listing

The CLI lists the available loops and what each needs.

#### Scenario: List loops
- WHEN the user runs `loopy list`
- THEN all available loops are shown with description, trigger, output, and required secrets

---

### Requirement: Loop Execution

The CLI can execute a loop end-to-end, used by the scaffolded workflow.

#### Scenario: Run a deterministic loop
- GIVEN a loop runnable with default boundaries
- WHEN the user runs `loopy run <loop>`
- THEN the loop runs and its output (PR or comment) is published

#### Scenario: Loop needing extra setup
- GIVEN a loop whose `act` requires an AI provider not configured
- WHEN the user runs `loopy run <loop>`
- THEN the command reports clear setup guidance instead of failing opaquely

## MODIFIED

(None)

## REMOVED

(None)
