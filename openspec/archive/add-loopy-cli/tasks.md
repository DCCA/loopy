# Implementation Tasks: loopy CLI

**Change ID:** `add-loopy-cli`

---

## Phase 1: Catalog & Templates
- [x] 1.1 Loop catalog (id, description, trigger, output, secrets, runnable)
- [x] 1.2 Workflow template generator (per trigger + secrets)
- [x] 1.3 Tests for catalog + template rendering

## Phase 2: Commands
- [x] 2.1 `add <loop>` — scaffold workflow into `.github/workflows/`
- [x] 2.2 `list` — print catalog
- [x] 2.3 `run <loop>` — execute with default boundaries (deterministic loops)
- [x] 2.4 Arg parsing + `--help`; `main()` exported for tests
- [x] 2.5 Tests: add (temp dir), list, run dispatch (injected fakes), unknown loop

## Phase 3: Packaging
- [x] 3.1 `bin` entry + shebang; export from package
- [x] 3.2 README "1-click import" section

**Quality Gate:** typecheck + lint + tests + build

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
