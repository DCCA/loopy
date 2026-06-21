# Implementation Tasks: OpenRouter AI Provider

**Change ID:** `add-openrouter-ai-provider`

---

## Phase 1: AI client & config
- [x] 1.1 OpenAI-compatible client (`src/ai/client.ts`, injectable fetch)
- [x] 1.2 Env config resolver (`src/ai/config.ts`, OpenRouter defaults)
- [x] 1.3 Tolerant JSON-response parsing (`src/ai/json.ts`)
- [x] 1.4 Tests: client (fake fetch), config, JSON parsing

## Phase 2: Boundary adapters
- [x] 2.1 `createDocWriter` (reads docs + changed surface → DocChange[])
- [x] 2.2 `createReviewer` (diff → ReviewResult)
- [x] 2.3 `createTestGenerator` (gaps → FileChange[])
- [x] 2.4 Tests with a fake AI client

## Phase 3: Wire-up & scaffold
- [x] 3.1 `loopy run auto-docs` builds the loop with the AI doc writer when keyed
- [x] 3.2 Catalog + template + example workflow use `OPENROUTER_API_KEY`
- [x] 3.3 Update CLI tests for the new secret name
- [x] 3.4 README: OpenRouter env vars

**Quality Gate:** typecheck + lint + tests + build

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
