# Loopy Catalog: High-Value Automation Loops for Software Teams

> Research report seeding loopy's loop catalog. Produced 2026-06-21.
> Loop contract reference: `trigger → detect → act → output → guardrails`
> (see `openspec/project.md`). The seed loop, **auto-docs**, is specified in
> `openspec/changes/add-auto-docs-loop/`.

## 1. What makes a good "loop" candidate

A loop earns its place when the work is **recurring** (it comes back every commit,
merge, release, or week), the drift is **mechanically detectable** (a cheap check
can answer "is there work?" without an LLM), the result is **PR-shippable** (a
reviewable diff, not a side-effecting action against prod), and the change is
**low-blast-radius** (scoped, idempotent, easy to revert). The best candidates pair
a *deterministic detector* (so you don't burn tokens or open noisy PRs when nothing
changed) with an *AI or codemod actor* for the part that needs judgment or natural
language. Documentation, the seed loop, is the canonical example: agents hit
**85–88% PR-acceptance on doc tasks, beating the human baseline of 76.5%**, precisely
because the work is NL-generation over detectable code drift.

---

## 2. Prioritized loop catalog

Ratings are **Effort × Value** (Low/Med/High). "Act" notes whether the heavy lifting
is **Deterministic** (codemod/script), **AI** (agent step), or **Hybrid**.

### Documentation

| Loop | Description | Trigger | Detect | Act | Output | Risk / Guardrails | E×V |
|---|---|---|---|---|---|---|---|
| **Auto-update repo docs from code** *(seed)* | Regenerate README/usage docs when public surface changes | Push to main / merge | Diff touches exported symbols, CLI flags, config schema | AI | PR | Scope to docs paths only; never touch code; human review | Med × High |
| **API reference sync** | Keep generated API docs / OpenAPI-derived reference in lockstep with handlers | Merge | Route/handler signature diff vs. last-generated spec | Hybrid | PR | Deterministic regen + AI prose for descriptions; fail-closed if spec invalid | Med × High |
| **Changelog backfill** | Group merged PRs since last tag into a CHANGELOG entry | Release tag / weekly cron | New merged PRs since last tag | Hybrid | PR | Classify by conventional-commit type; AI summarizes; require approval | Low × High |
| **Docstring / comment coverage** | Add missing docstrings to public functions | Weekly cron | Static scan: public symbols lacking docstrings | AI | PR (batched) | Cap N per PR; never alter logic; lint-gate | Low × Med |
| **Doc link & example rot** | Fix broken internal links and stale code samples in docs | Weekly cron | Link checker + run embedded examples in CI | Hybrid | PR | Auto-fix only verifiable breakage; flag ambiguous ones as issues | Low × Med |
| **Onboarding/CONTRIBUTING freshness** | Update setup steps when build/tooling config changes | Change to package.json/Dockerfile/CI | Diff in dep-manager, scripts, or CI config | AI | PR | Suggest-only; humans own onboarding accuracy | Low × Med |

### Code health

| Loop | Description | Trigger | Detect | Act | Output | Risk / Guardrails | E×V |
|---|---|---|---|---|---|---|---|
| **Dependency updates** | Open grouped, tested PRs for outdated/vulnerable deps | Cron | Lockfile vs. registry latest + advisory DB | Deterministic | PR | **Group + batch** to fight PR fatigue (only 32% of ungrouped Dependabot PRs merge); automerge low-risk on green CI | Low × High |
| **Deprecated-API / codemod migration** | Apply framework migrations across the codebase | New major release / cron | AST scan for deprecated call sites | Deterministic (jscodeshift/Semgrep) + AI for edge cases | PR | AST-based, not regex; CI must stay green; one migration per PR | Med × High |
| **Dead-code cleanup** | Delete provably-unused code | Monthly cron | Static + dynamic reachability analysis (cf. Meta SCARF) | Deterministic | PR | Only delete with high-confidence reachability proof; easy revert | High × Med |
| **Lint/format autofix** | Apply formatter and safe lint fixes | PR open / push | Linter reports fixable findings | Deterministic | PR commit (autofix.ci style) | Only mechanical, autofixable rules; never semantic rewrites | Low × Med |
| **Type-coverage ratchet** | Add types / tighten `any` incrementally | Weekly cron | Type-checker reports untyped boundaries | AI | PR (small batches) | Ratchet (never regress); cap diff size; CI type-check gate | Med × Med |

### Quality / review

| Loop | Description | Trigger | Detect | Act | Output | Risk / Guardrails | E×V |
|---|---|---|---|---|---|---|---|
| **AI PR review & summary** | Auto-summarize diffs and flag bugs/standards violations | PR open / sync | New PR diff | AI | PR comment | Advisory only, never auto-merge on AI verdict; learns team feedback (CodeRabbit/Ellipsis model) | Low × High |
| **Test-coverage backfill** | Generate tests for newly uncovered lines | Merge / weekly cron | Coverage delta on changed lines | AI | PR | Generated tests must pass + actually raise coverage; human review for assertions | Med × High |
| **Flaky-test detect & quarantine** | Identify and quarantine non-deterministic tests | After CI runs | Re-run / ML flake scoring (Trunk-style) | Hybrid | PR (quarantine) + issue | Quarantine ≠ delete; auto-file tracking issue; expiry on quarantine | Med × High |
| **Test-failure triage** | Cluster CI failures into root-cause groups, propose fix | CI red on main | Failure logs clustering | AI | Issue / draft PR | Don't auto-merge fixes to main; surface as draft | Med × Med |

### Project hygiene

| Loop | Description | Trigger | Detect | Act | Output | Risk / Guardrails | E×V |
|---|---|---|---|---|---|---|---|
| **Issue triage & labeling** | Classify, label, dedupe, request repro info | Issue opened | New/unlabeled issue | AI | Labels + comment | Read-before-acting; never auto-close on triage; transparent policy | Low × High |
| **Stale issue/PR management** | Nudge or close inactivity *with context* | Cron | Last-activity age threshold | Hybrid | Comment / close | "Reads first" (Dosu better-stale-bot pattern); audit log; avoid blunt time-only closes | Low × Med |
| **Release-please style release PR** | Maintain an always-ready release PR | Merge to main | Conventional commits since last release | Deterministic | PR | PR-gated (human merges to ship); version bump only | Low × High |
| **Contributors / metadata upkeep** | Keep contributors list, FUNDING, badges current | Merge / cron | New committers, config drift | Deterministic | PR | Cosmetic only; trivial review | Low × Low |

### Cross-repo / org

| Loop | Description | Trigger | Detect | Act | Output | Risk / Guardrails | E×V |
|---|---|---|---|---|---|---|---|
| **Org-wide config/template sync** | Propagate shared CI, lint, license, CODEOWNERS to all repos | Template change / cron | Diff repo config vs. golden template | Deterministic | PR per repo | Per-repo PRs (never force-push); allow opt-out marker | Med × High |
| **SDK/spec regeneration** | Regenerate client SDKs when OpenAPI/proto spec changes | Spec merge | Spec hash differs from generated artifact | Deterministic | PR in client repos | Generated-code guard; CI build-check; pin generator version | Med × High |
| **i18n key sync** | Add missing translation keys across locales | Source string change | Diff key sets across locale files | Hybrid | PR | Machine-translate as draft, mark for human translator review; never overwrite reviewed strings | Med × Med |

### Security

| Loop | Description | Trigger | Detect | Act | Output | Risk / Guardrails | E×V |
|---|---|---|---|---|---|---|---|
| **Security patch / CVE remediation** | Open fix PRs for vulnerable deps and SAST findings | Advisory / scan | SCA/SAST finding above severity threshold | Hybrid | PR (Mobb/Aikido/Semgrep-autofix style) | False-positive filtering before opening PR; security-team review; never auto-merge | Med × High |
| **Secret-leak response** | Detect committed secrets and open remediation | Push / scan | Secret scanner hit | Hybrid | Issue + PR (rotate refs) | **Alert first**, rotation is human-gated; never echo secret in PR | Low × High |
| **License / SBOM compliance** | Flag disallowed licenses, refresh SBOM | Dep change / cron | License of new deps vs. policy allowlist | Deterministic | PR / blocking check | Policy-driven; block on copyleft violations | Low × Med |

### Ops

| Loop | Description | Trigger | Detect | Act | Output | Risk / Guardrails | E×V |
|---|---|---|---|---|---|---|---|
| **IaC drift remediation** | Reconcile declared infra vs. actual | Cron | `terraform plan` / cloud diff | Hybrid | PR | **Plan-only PR**, never auto-apply to prod; human approval for apply | High × Med |
| **CI/build-time & cost watch** | Flag slow/expensive workflows, suggest fixes | Cron | Build duration/cost trend regression | AI | Issue / PR | Suggestion-only for perf changes; no silent pipeline edits | Med × Med |

---

## 3. Top 5 to build after auto-docs

1. **Dependency updates (grouped + automerge-on-green)** — Highest-volume recurring
   drift on nearly every repo and the most battle-tested pattern (Renovate/Dependabot).
   The *differentiator* is shipping it with grouping/batching by default to dodge the
   well-documented PR-fatigue trap (only ~32% of naive bot PRs merge). Low effort,
   near-universal value.
2. **Changelog + release PR** — Cheap, deterministic detection (commits since tag),
   proven model (release-please/semantic-release), and PR-gated so it's inherently
   safe. Pairs naturally with the docs loop.
3. **AI PR review & summary** — Highest-frequency trigger (every PR), advisory-only so
   blast radius is zero, and the category with the clearest market validation
   (CodeRabbit, Ellipsis, Copilot review). Great showcase for loopy's AI-step.
4. **Test-coverage backfill** — Strong ROI, clear deterministic detector (coverage
   delta on changed lines), and the generated artifact is self-validating (tests must
   pass and raise coverage). Aligns with documented agent strengths in NL-adjacent
   generation.
5. **Security/CVE remediation PRs** — High value and increasingly expected;
   deterministic detection from scanners with an AI/codemod fix step. Build it with
   false-positive filtering and human-gated merge so it complements rather than
   competes with the dependency loop.

Honorable mention: **Org-wide config/template sync** — highest leverage for multi-repo
orgs and a natural showcase for loopy's "import a loop everywhere" value prop.

---

## 4. Guardrails & anti-patterns (where loops backfire)

- **PR fatigue is the #1 failure mode.** Ungrouped dependency bots produce so much
  noise that PRs linger or get rubber-stamped; studies show automation raises update
  frequency 1.6× but only ~32% of PRs merge. **Mitigation:** group/batch updates,
  automerge low-risk on green CI, and rate-limit open PRs per repo.
- **Detect deterministically before you act.** Never invoke the AI step (or open a PR)
  unless a cheap check confirms drift. This controls cost, prevents empty/no-op PRs,
  and keeps the loop idempotent.
- **AI verdicts are advisory, not gates.** Review/triage loops should comment and
  label, never auto-merge or auto-close on a model's say-so. "Read before you close"
  (Dosu's better-stale-bot) over blunt time-only stale bots.
- **Keep blast radius small and reversible.** One concern per PR, scope-limit file
  paths (docs loop touches docs, not code), cap diff size, and prefer plan-only PRs for
  anything that touches infra/prod. IaC and dead-code loops are the easiest to get
  catastrophically wrong — gate the *apply*, automate only the *proposal*.
- **Rubber-stamping is a silent failure.** A loop that produces PRs nobody truly reviews
  is worse than no loop; design for genuine reviewability (clear summaries, small diffs,
  self-validating artifacts like passing tests).
- **Secrets and security need a different default:** alert-first, human-gated
  rotation/merge, and never surface the secret in the PR.
- **Generated code needs guards:** pin generator versions, mark generated files, and
  gate on a build/CI check so regen loops don't drift or churn.

---

## Sources

- [Renovate Bot Comparison docs](https://docs.renovatebot.com/bot-comparison/)
- [Dependabot vs Renovate operational experience](https://safeguard.sh/resources/blog/dependabot-vs-renovate-operational-experience)
- [Integrating Renovate with Mergify](https://docs.mergify.com/integrations/renovate/)
- [Integrating Dependabot with Mergify](https://docs.mergify.com/integrations/dependabot/)
- [CodeRabbit documentation](https://docs.coderabbit.ai/)
- [AI Code Review Tools Compared: CodeRabbit vs Copilot vs Sourcery vs Ellipsis (DeployHQ)](https://www.deployhq.com/blog/ai-code-review-tools-compared-coderabbit-copilot-sourcery-ellipsis)
- [Sweep AI overview](https://aiagentslist.com/agents/sweep-ai)
- [The Rise of AI Teammates in SE 3.0 (arXiv 2507.15003)](https://arxiv.org/pdf/2507.15003) — doc-task PR acceptance data (Codex 88.6%, Claude Code 85.7% vs. human 76.5%)
- [Autonomous Agents in Software Development: A Vision Paper (arXiv 2311.18440)](https://arxiv.org/html/2311.18440v1)
- [AIDev: Studying AI Coding Agents on GitHub (arXiv)](https://arxiv.org/pdf/2602.09185)
- [semantic-release (GitHub)](https://github.com/semantic-release/semantic-release)
- [Combining GitHub Actions with semantic-release and release-please](https://gist.github.com/aneudy1702/060494e9e0bc7b7305f10f336d4f45c1)
- [Automate repository tasks with GitHub Agentic Workflows (GitHub Blog)](https://github.blog/ai-and-ml/automate-repository-tasks-with-github-agentic-workflows/)
- [GitHub AI automation: PR review, issue triage, changelog (MasterPrompting)](https://masterprompting.net/blog/github-ai-automation-pr-review-issue-triage-agent)
- [GitHub Marketplace (Actions categories)](https://github.com/marketplace)
- [Beyond Coverage: Flaky Test Detection & AI Test Generation (Sentry)](https://blog.sentry.io/beyond-coverage-flaky-test-detection-ai-test-generation-and-more/)
- [Trunk Flaky Tests (detection & quarantine)](https://trunk.io/flaky-tests)
- [awesome-ai-testing (GitHub)](https://github.com/tugkanboz/awesome-ai-testing)
- [Automating dead code cleanup (Engineering at Meta / SCARF)](https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/)
- [Refactoring with Codemods to Automate API Changes (Martin Fowler)](https://martinfowler.com/articles/codemods-api-refactoring.html)
- [Next.js Codemods](https://nextjs.org/docs/app/guides/upgrading/codemods)
- [better-stale-bot: an AI stale bot that reads first (Dosu)](https://dosu.dev/blog/an-ai-stale-bot-that-you-can-trust)
- [Automating GitHub Issue Triage (Dosu)](https://dosu.dev/blog/automating-github-issue-triage)
- [Repro-Bot issue triage agent (Metabase)](https://www.metabase.com/blog/reprobot-github-issue-triage-agent)
- [Aikido AI SAST & IaC Autofix](https://www.aikido.dev/code/autofix)
- [Semgrep App Security Platform](https://semgrep.dev/)
- [Top SAST Tools 2026 (OX Security)](https://www.ox.security/blog/static-application-security-sast-tools/)
- [Automating Dependency Updates in Practice: Dependabot study (arXiv 2206.07230)](https://arxiv.org/pdf/2206.07230) — 1.6× update frequency, ~32% merge rate
- [16 Best Practices for Reducing Dependabot Noise (Andrew Nesbitt)](https://nesbitt.io/2026/01/10/16-best-practices-for-reducing-dependabot-noise.html)
- [Reducing Alert Fatigue via AI-Assisted Negotiation for Dependabot (arXiv 2502.06175)](https://arxiv.org/pdf/2502.06175)
- [Reducing Team Workload with Bot Automation (LinearB)](https://linearb.io/blog/bot-automation)
- [i18next extracting translations](https://www.i18next.com/how-to/extracting-translations)
- [How to auto-translate JSON files for localization (SimpleLocalize)](https://simplelocalize.io/blog/posts/how-to-auto-translate-json-files/)
