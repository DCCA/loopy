# Proposal: OpenRouter / OpenAI-Compatible AI Provider

**Change ID:** `add-openrouter-ai-provider`
**Created:** 2026-06-21
**Status:** Implementation Complete
**Completed:** 2026-06-21

---

## Problem Statement

loopy's AI loops (auto-docs, pr-review, test-coverage) declare an injected AI
boundary but ship **no built-in provider**, so `loopy run` cannot execute them
and the scaffolded workflows reference a placeholder `ANTHROPIC_API_KEY`. Users
want to power the AI step from **OpenRouter** (one API key, many models) in
GitHub Actions.

## Proposed Solution

Add a **generic OpenAI-compatible AI client** (`src/ai/`) plus boundary adapters
that implement the loops' AI steps (`DocWriter`, `Reviewer`, `TestGenerator`).
It defaults to OpenRouter (`https://openrouter.ai/api/v1`) and a Claude model,
but works with any OpenAI-compatible endpoint (OpenAI, Azure, Ollama) via env.

- **Config from env:** `OPENROUTER_API_KEY` (or `LOOPY_AI_API_KEY` / `OPENAI_API_KEY`),
  `LOOPY_AI_BASE_URL` (default OpenRouter), `LOOPY_AI_MODEL` (default
  `anthropic/claude-3.7-sonnet`).
- **Wire `loopy run` for auto-docs:** with an AI key present, auto-docs becomes
  **turnkey** end-to-end (its only missing boundary was the doc writer). The
  `Reviewer` and `TestGenerator` adapters are provided too, ready for when those
  loops' non-AI boundaries (PR diff, coverage report) are wired.
- **Scaffold/catalog:** AI loops list `OPENROUTER_API_KEY` instead of
  `ANTHROPIC_API_KEY`; `loopy add` injects that secret.

## Scope

### In Scope
- `src/ai/`: OpenAI-compatible client (injectable `fetch`), env config resolver,
  JSON-response parsing, and the three boundary adapters
- Wire auto-docs into `loopy run` when an AI key is present
- Update catalog + workflow template + example workflow to `OPENROUTER_API_KEY`
- Unit tests (client via fake fetch, config, JSON parsing, adapters via fake client)

### Out of Scope
- Making pr-review / test-coverage fully turnkey (need PR-diff and coverage
  boundaries — separate changes)
- Streaming, tool-calling, ret/backoff tuning (basic, robust call only)
- Publishing to npm

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Core | No | Reuses contract/runner |
| New `src/ai/` | Yes | Provider + adapters |
| CLI `run` | Yes | Build auto-docs with the AI doc writer |
| Catalog/template | Yes | `OPENROUTER_API_KEY` secret |

## Architecture Considerations

The provider sits behind the existing injected boundaries — loops stay
provider-agnostic; the client is the single integration point. Defaulting to an
OpenAI-compatible surface keeps it portable (OpenRouter today, anything tomorrow).

## Success Criteria

- [ ] An OpenAI-compatible client posts to `{baseUrl}/chat/completions` with the bearer key and returns the message content.
- [ ] Env config resolves OpenRouter by default and is overridable; no key → null.
- [ ] `loopy run auto-docs` builds the loop with the AI doc writer when a key is present, and gives clear guidance when absent.
- [ ] `loopy add <ai-loop>` scaffolds `OPENROUTER_API_KEY`.
- [ ] Adapters parse model JSON into `DocChange[]` / `ReviewResult` / `FileChange[]`.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Model returns non-JSON | Med | Med | Tolerant JSON extraction; fail safe (no output) on parse error |
| Provider/network failure | Low | Med | Runner fails safe — no partial output |
| Model id drift across providers | Med | Low | Model is env-configurable; documented default |

---

## Archive Information

**Archived:** 2026-06-21
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 75 tests + build all passing
