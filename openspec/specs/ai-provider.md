# AI Provider Specification

> Source of truth. Established by change `add-openrouter-ai-provider` (2026-06-21).

loopy ships a built-in, OpenAI-compatible AI provider (defaulting to OpenRouter
with a Claude model) that powers the loops' injected AI boundaries.

## Requirements

### Requirement: OpenAI-Compatible AI Client

loopy provides a built-in OpenAI-compatible chat client, defaulting to
OpenRouter, configurable by environment.

#### Scenario: Completion request
- GIVEN an API key, base URL, and model
- WHEN the client is asked to complete a prompt
- THEN it POSTs to `{baseUrl}/chat/completions` with a bearer token and returns the message content

#### Scenario: Config resolved from environment
- GIVEN `OPENROUTER_API_KEY` is set
- WHEN the AI config is resolved
- THEN it uses the OpenRouter base URL and the default Claude model unless overridden by `LOOPY_AI_BASE_URL` / `LOOPY_AI_MODEL`

#### Scenario: No key
- GIVEN no AI API key is set
- WHEN the AI config is resolved
- THEN it resolves to none and AI loops are not run

---

### Requirement: AI Boundary Adapters

The provider supplies the loops' AI boundaries (doc writer, reviewer, test
generator) by parsing structured model output.

#### Scenario: Doc writer produces changes
- GIVEN drift context for the auto-docs loop
- WHEN the AI doc writer runs
- THEN it returns the updated doc files parsed from the model response

---

### Requirement: Turnkey auto-docs via the CLI

`loopy run auto-docs` executes end-to-end when an AI key is configured, and
guides the user otherwise.

#### Scenario: Keyed run
- GIVEN `OPENROUTER_API_KEY` is set
- WHEN the user runs `loopy run auto-docs`
- THEN the loop runs with the AI doc writer and publishes its output

#### Scenario: Missing key
- GIVEN no AI key is set
- WHEN the user runs `loopy run auto-docs`
- THEN the command reports that an AI key is required instead of failing opaquely

---

### Requirement: Scaffold the AI Secret

`loopy add` scaffolds `OPENROUTER_API_KEY` for loops that need an AI step.

#### Scenario: Add an AI loop
- WHEN the user runs `loopy add auto-docs`
- THEN the generated workflow wires `OPENROUTER_API_KEY`
