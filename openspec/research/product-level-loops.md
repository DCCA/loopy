# Product-Level Loops: Research Report

> Deep dive #2 for loopy. Explores **complex, long-horizon, product-level loops**
> that act on the product and business — not just the codebase. Produced 2026-06-22.
> Companion to [`loop-use-cases.md`](loop-use-cases.md) (the repo-maintenance catalog).

## A. How product-level loops differ from repo-maintenance loops

Today's loopy loops are **single-shot and stateless**: a trigger fires, the loop
detects a repo condition, acts, emits a reviewable PR/comment, and exits — all in
one CI invocation. Product-level loops break almost every one of those
assumptions. They are **long-horizon** (days–weeks; an A/B test must bake, a
postmortem's action items live for a quarter), **stateful with memory across
runs** (remember which themes became specs, which accounts were already
contacted), and **multi-step with planning and resumption** (detect → triage →
mitigate → review → follow-up, often pausing for human input mid-flight). They
draw on **multiple non-repo data sources** (support, analytics warehouses,
observability/SLOs, CRM, app-store reviews) and emit artifacts **beyond PRs**
(tickets, experiments, dashboards, alerts, exec briefs, decisions). Critically,
they need **human-in-the-loop checkpoints** as first-class gates (ship/no-ship,
"is this insight real," compliance sign-off) rather than the implicit "a human
reviews the PR" guardrail of repo loops.

| Dimension | Repo-maintenance loop (today) | Product-level loop (proposed) |
|---|---|---|
| Horizon | Seconds–minutes, one CI run | Days–weeks, recurring |
| State | Stateless | Persistent memory across runs |
| Plan | Fixed detect→act | Multi-step, branching, resumable |
| Data sources | The repo | Support, analytics, observability, CRM, reviews |
| Output | PR / comment | Tickets, experiments, dashboards, alerts, briefs, decisions |
| Human gate | PR review (implicit) | Explicit approval checkpoints mid-loop |

---

## B. Catalog of product-level loop candidates

Ratings are **Effort × Value** (Low/Med/High each), grouped by theme.

### Theme 1 — Product discovery & feedback

**1. Voice-of-Customer Theme Miner** — Effort **High** × Value **High**
- Ingests feedback from all channels (support, reviews, NPS, sales calls) and clusters it into prioritized opportunity themes.
- *Trigger:* scheduled + new-feedback-volume threshold. *Detect:* new/spiking clusters vs. baseline.
- *Act:* pull connectors → embed + cluster into a taxonomy → detect emerging themes → tie to accounts/revenue → draft opportunity brief → route to roadmap tool.
- *Output:* ranked opportunity briefs, auto-tagged feedback, roadmap items. *Human gate:* PM confirms a theme is real.
- *State:* persistent taxonomy, per-theme history, dedupe, account/revenue map. *Risks:* taxonomy drift, loud-minority bias, PII in transcripts.

**2. Opportunity → Spec Drafter (continuous discovery)** — Effort **Med** × Value **High**
- Turns a confirmed opportunity into a draft spec + assumption set against an opportunity-solution tree (Teresa Torres model).
- *Act:* assemble verbatims → place on the OST → surface candidate solutions → list riskiest assumptions → draft one-pager → propose small assumption tests.
- *Human gate:* product trio reviews/edits. *State:* the OST + per-opportunity assumption ledger. *Risks:* hallucinated requirements, solution-jumping.

### Theme 2 — Growth & experimentation

**3. Experiment Lifecycle Orchestrator** — Effort **High** × Value **High**
- Drives an experiment from hypothesis → design → ship → readout → decision.
- *Act:* design (variants, MDE, duration) → attach goal + guardrail metrics → ship via feature flag/progressive rollout → monitor daily for significance + guardrail breaches → generate readout → recommend ship/kill/iterate.
- *Output:* experiment config, interim alerts, readout, decision rec. *Human gate:* approve design; final ship/kill.
- *State:* experiment registry + learnings library. *Risks:* peeking bias, SRM, underpowered tests, guardrail regressions.

**4. Guardrail-Breach Auto-Rollback Watcher** — Effort **Med** × Value **High**
- Watches live experiments/rollouts; flags or rolls back on guardrail-metric regression.
- *Act:* detect breach w/ significance → confirm not a data artifact → page owner → propose rollback → on approval, execute → log to experiment record.
- *Human gate:* approve rollback (unless pre-authorized for severe breaches). *Risks:* acting on noisy intraday metrics, runaway rollbacks.

### Theme 3 — Reliability / incident

**5. Incident Lifecycle Coordinator** — Effort **High** × Value **High**
- Runs an incident from declaration → postmortem → action-item closure (cf. incident.io, Rootly).
- *Act:* open incident + comms channel → auto-triage (impact, what-changed, blast radius) → suggest mitigations/runbooks → capture timeline → AI-assisted postmortem → create + track action items.
- *Human gate:* incident commander owns mitigation; postmortem reviewed before publish. *State:* open-incident state, timeline, action-item ledger.

**6. Postmortem Action-Item & Recurrence Loop** — Effort **Med** × Value **High**
- Tracks postmortem follow-ups and detects recurring failure patterns across incidents.
- *Act:* sweep open action items → nudge overdue owners → cluster incidents by root cause → flag systemic patterns → draft prevention brief.
- *State:* cross-incident action-item + root-cause history (the core memory). *Risks:* nag fatigue, bad clustering.

**7. SLO / Error-Budget Policy Loop** — Effort **Med** × Value **Med**
- Monitors SLO burn rate; enforces error-budget policy (e.g. freeze feature work when budget spent).
- *Act:* compute burn rate → project exhaustion → on threshold recommend reliability focus/freeze → open tracking issue → notify. *Human gate:* leadership ratifies a freeze. *Risks:* noisy SLI → false freezes, SLO gaming.

### Theme 4 — Analytics / insight

**8. Metric Anomaly → Root-Cause Narrator** — Effort **High** × Value **High**
- Watches key metrics, detects anomalies, diagnoses likely cause, narrates it (cf. Sisu, Datadog Watchdog).
- *Act:* detect anomaly vs. baseline → decompose across dimensions (metric tree) → correlate with related metrics + recent changes (deploys, campaigns) → rank likely drivers → draft narrative alert → route to owner.
- *Human gate:* analyst confirms before it becomes an exec narrative. *State:* baselines, prior anomalies, known-cause library. *Risks:* alert fatigue, correlation-as-cause.

**9. Weekly Metrics Brief Generator** — Effort **Low** × Value **Med**
- Compiles a recurring KPI narrative; reuses #8's anomaly explanations. *Risks:* narrative overfitting noise, stale metric defs.

### Theme 5 — Lifecycle / retention

**10. Churn-Signal → Intervention Loop** — Effort **High** × Value **High**
- Scores accounts for churn risk, routes the right intervention by churn type (involuntary → billing recovery; voluntary → CSM/value), then measures impact and feeds the model.
- *Human gate:* CSM approves high-value outreach / discounting. *State:* per-account intervention history, outcomes. *Risks:* over-contacting, margin leak from discounting non-churners, acting on noisy scores.

**11. Onboarding / Activation Nudge Loop** — Effort **Med** × Value **Med**
- Detects stalled activation and triggers lifecycle nudges toward the activation milestone, with a holdout to measure lift. *Risks:* notification fatigue, no holdout = unmeasurable.

### Theme 6 — Support deflection / self-heal

**12. KB-Gap → Self-Heal Loop** — Effort **Med** × Value **High**
- Finds doc gaps from tickets + failed searches, drafts/updates KB, measures deflection.
- *Act:* cluster recurring tickets → detect missing/conflicting KB → draft articles from resolved-ticket resolutions → SME review → publish → measure deflection-rate change.
- *Output:* draft KB articles, gap report, deflection metrics (self-service ≈ $0.25 vs. $12–16 per human-handled interaction). *Human gate:* SME approves before publish. *Risks:* publishing wrong docs, deflecting tickets that need a human.

**13. Recurring-Ticket → Product-Fix Escalator** — Effort **Low** × Value **Med**
- Detects high-volume ticket themes signaling a bug/UX issue; drafts an evidence-backed product/eng ticket with cost/volume impact. *Risks:* duplicate issues, misattributing user error to bugs.

### Theme 7 — Data quality / FinOps / compliance

**14. Data-Quality / Data-Contract Loop** — Effort **Med** × Value **Med**
- Monitors pipelines against contracts + quality baselines (cf. dbt contracts), triages breaks via lineage, opens fixes/quarantine. *Risks:* alert fatigue, blocking on benign drift.

**15. FinOps Cost-Optimization Loop** — Effort **Med** × Value **High**
- Detects cost anomalies + waste (idle/oversized resources, orphaned volumes), recommends/optionally executes remediation, tracks realized savings. *Human gate:* approve prod resource changes. *Risks:* auto-killing prod capacity, acting on transient spikes.

**16. Continuous Compliance / Evidence-Collection Loop** — Effort **High** × Value **High**
- Continuously tests controls + collects evidence + remediates drift for SOC 2/ISO/HIPAA (cf. Vanta, Drata). *Human gate:* security owner signs off on remediations/attestations. *State:* control state over time, evidence ledger. *Risks:* false "compliant" status, auto-changing security config.

---

## C. What loopy's framework would need to add

| Capability | What it enables | Loops requiring it |
|---|---|---|
| **Persistent loop state & memory across runs** | Remember surfaced themes, contacted accounts, baselines, open items, dedupe | Nearly all (1,2,3,5,6,8,10,11,12,14,15,16) |
| **Multi-step plan orchestration with resumption** | Resumable detect→triage→mitigate→review→follow-up that survives pauses/failures | 3,5,6,8,10,16 |
| **Long-horizon scheduling & wait-states** | "bake 14 days", "re-check weekly", "measure outcome in 30 days" | 3,4,6,7,9,10,11,12,16 |
| **Human-approval checkpoints / gates** | First-class pause-for-approval with audit trail (ship/kill, publish, rollback, attest) | 1,2,3,4,5,10,12,15,16 |
| **Non-PR output adapters** | Issue trackers (Jira/Linear), experimentation platforms, CRM/marketing, notifications/dashboards, KB systems | 1,3,5,8,9,10,11,12,13,15,16 |
| **Non-repo data-source boundaries (injected)** | Connectors: support, analytics/warehouse, observability/SLOs, reviews, CRM, cost APIs, compliance | 1,8,10,12,14,15,16 |
| **Metric/statistics primitives** | Significance testing, anomaly baselines, guardrail thresholds, holdouts — to avoid acting on noise | 3,4,8,9,10,11 |
| **Idempotency & action-suppression registry** | Prevent re-spamming users, duplicate tickets, repeated rollbacks | 5,10,11,13,15 |
| **Budget / blast-radius limiter on actions** | Cap users contacted, resources changed, rollbacks per window | 4,10,11,15,16 |
| **Audit log of decisions & evidence** | Reconstruct why the loop acted (compliance, postmortems, learnings) | 5,6,16 (hygiene for all) |

The two biggest leaps from today's model: **(a) durable state + resumable
multi-step execution** (everything else builds on this), and **(b) human-approval
gates as a native primitive** rather than the implicit "review the PR".

---

## D. Top 5 to pursue

1. **KB-Gap → Self-Heal (#12)** — best feasibility-to-value; a KB PR is close to a code PR, so it reuses loopy's existing "detect → draft → reviewable artifact" muscle with a natural review gate. Strong wedge.
2. **Experiment Lifecycle Orchestrator (#3)** — highest differentiation; no incumbent owns the *whole* loop, and it's exactly the multi-step, long-horizon, human-gated pattern that justifies the new framework.
3. **Metric Anomaly → Root-Cause Narrator (#8)** — high value + reusable engine feeding #9, #4, #10, #14, #15.
4. **Incident Action-Item & Recurrence (#6 → then #5)** — strong value, contained scope, clear memory story; complements incident.io/Rootly rather than competing.
5. **Churn-Signal → Intervention (#10)** — highest business value and exercises every new primitive — but pursue *after* the framework primitives exist, given its risk surface.

---

## E. Anti-patterns (where long-horizon autonomous loops backfire)

- **Acting on noisy metrics** — require significance + minimum sample/duration before any action (#3,4,7,8,10).
- **Runaway / unbounded actions** — cap blast radius per window; gate high-impact actions (churn emails, prod termination, rollbacks).
- **Missing human gates** — high-stakes outputs (compliance sign-off, ship/kill, prod changes) need explicit approval, not implicit PR review.
- **Statefulness bugs** — lost/duplicated state → re-spamming, duplicate tickets, dropped action items. Idempotency keys + suppression registry are mandatory.
- **Spurious causation** — anomaly narrators presenting correlation as cause; mark confidence + keep a human "is this real?" gate.
- **Metric gaming** — pair every optimized metric (deflection, SLO) with a guardrail/quality metric.
- **Alert fatigue** — dedupe, batch, threshold aggressively or humans tune the loop out.

---

## F. Sources

- [Aha! — Customer Feedback Loops](https://www.aha.io/roadmapping/guide/what-is-a-feedback-loop)
- [Aha! — Voice of the Customer](https://www.aha.io/roadmapping/guide/what-is-the-voice-of-the-customer)
- [Productboard — Spark AI Feedback Analysis](https://www.productboard.com/blog/productboard-spark-ai-customer-feedback-analysis/)
- [Enterpret — Tools for Product Insights](https://www.enterpret.com/guides/the-6-top-rated-tools-for-product-insights-based-on-user-feedback)
- [Maze — Continuous Product Discovery](https://maze.co/guides/product-discovery/continuous/)
- [Product Talk (Teresa Torres) — Getting Started with Discovery](https://www.producttalk.org/getting-started-with-discovery/)
- [Eppo — What are Guardrail Metrics?](https://www.geteppo.com/blog/what-are-guardrail-metrics-with-examples)
- [GrowthBook Docs — Experimenting](https://docs.growthbook.io/using/experimenting)
- [PostHog — Best Eppo Alternatives](https://posthog.com/blog/best-eppo-alternatives)
- [Rootly — Incident Response Lifecycle](https://rootly.com/incident-response/lifecycle-process)
- [incident.io — Incident Management Best Practices 2026](https://incident.io/blog/incident-management-best-practices-2026)
- [Datadog — AI-powered metrics monitoring & anomaly detection](https://www.datadoghq.com/blog/ai-powered-metrics-monitoring/)
- [Datadog — Watchdog Root Cause Analysis](https://www.datadoghq.com/about/latest-news/press-releases/datadog-expands-its-watchdog-ai-engine-with-root-cause-analysis-and-log-anomaly-detection/)
- [Anomalo — Data Observability](https://www.anomalo.com/data-observability-tools/)
- [CleverTap — Churn Prediction](https://clevertap.com/blog/churn-prediction/)
- [Emarsys/SAP — Predictive Customer Analytics & Churn](https://emarsys.com/learn/blog/predictive-customer-analytics/)
- [Pylon — AI Ticket Deflection](https://www.usepylon.com/blog/ai-ticket-deflection-reduce-support-volume-2025)
- [Fini Labs — AI Knowledge Base Gap & Conflict Detection](https://www.usefini.com/guides/ai-knowledge-base-gap-conflict-detection-support)
- [Atlan — dbt Data Quality Guide 2026](https://atlan.com/dbt-data-quality/)
- [DataHub — What Are Data Contracts](https://datahub.com/blog/the-what-why-and-how-of-data-contracts/)
- [AWS — FinOps Agent](https://aws.amazon.com/finops-agent/)
- [Vanta — Automated Compliance](https://www.vanta.com/products/automated-compliance)
- [Drata — Compliance Automation Platform](https://drata.com/compliance)

> Note: several vendor/practitioner pages returned HTTP 403 to automated
> fetching; their content is cited from search-result extracts that quoted those
> pages. Quantitative vendor claims (deflection economics, ~3.1pt churn
> reduction, Vanta/Drata test cadence and evidence-automation %) are directional
> marketing figures, not independently audited.
