# Proposal: Landing Page (GitHub Pages)

**Change ID:** `add-landing-page`
**Created:** 2026-06-22
**Status:** Implementation Complete
**Completed:** 2026-06-22

---

## Problem Statement

loopy has no public face. A polished landing page communicates the value
(one importable, guardrailed framework spanning many automation loops) and, with
an honest "compared to best-in-class" table, positions it against point tools.

## Proposed Solution

Add a self-contained static site under `site/` (hand-written HTML + CSS, no build,
no CDNs) and a GitHub Actions workflow (`.github/workflows/pages.yml`) that
deploys it to GitHub Pages on push to `main`.

- Sections: hero + CTA, the loop contract, loops grid, 1-click install, a
  fair comparison table (vs Dependabot/Renovate, CodeRabbit, Vanta/Drata,
  Statsig/Eppo), long-horizon primitives, footer.
- Premium, responsive, accessible design; no external dependencies.

## Scope

### In Scope
- `site/index.html`, `site/styles.css`, inline SVG logo
- Pages deploy workflow (Actions source)

### Out of Scope
- Full docs site / versioned docs
- Custom domain

## Success Criteria

- [ ] `site/` renders a complete, responsive landing page with the comparison table.
- [ ] A Pages workflow deploys `site/` on push to `main`.
- [ ] No external runtime dependencies.

> Note: the repo's Pages source must be set to "GitHub Actions" in Settings for
> the deploy to publish; the site + workflow are delivered regardless.

## Risks & Mitigations

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Unfair/overclaiming comparison | Med | Med | Factual rows + honest caption that specialists go deeper |
| Pages not enabled | Med | Low | Documented one-time repo setting; non-blocking workflow |

---

## Archive Information

**Archived:** 2026-06-22
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 126 tests + build all passing
