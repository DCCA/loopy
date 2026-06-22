# Implementation Tasks: KB-Gap Self-Heal Loop

**Change ID:** `add-kb-gap-loop`

---

## Phase 1: Loop
- [x] 1.1 `hooks/gaps.ts` (Ticket/TicketSource/KbGap, findGaps + normalizeTopic)
- [x] 1.2 `index.ts` (createKbGapLoop + createKbGapLoopFromManifest; ArticleWriter boundary)
- [x] 1.3 `loop.yaml`, `playbook.md`, `README.md`
- [x] 1.4 Unit tests (findGaps, detect, act, guardrail fail-safe)

## Phase 2: AI + CLI wiring
- [x] 2.1 `createArticleWriter` adapter in `src/ai/providers.ts`
- [x] 2.2 Catalog entry (`kb-gap`, AI secret) + template
- [x] 2.3 `loopy run kb-gap` turnkey with default boundaries
- [x] 2.4 CLI tests updated

**Quality Gate:** typecheck + lint + tests + build

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
