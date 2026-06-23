# Delta: Landing Page

**Change ID:** `add-landing-page`
**Affects:** `site/`, `.github/workflows/pages.yml`

---

## ADDED

### Requirement: Public Landing Page

The project ships a self-contained static landing page that explains loopy and
positions it against best-in-class point tools.

#### Scenario: Page content
- GIVEN the `site/` directory
- WHEN it is served
- THEN it presents the loop contract, the loops, 1-click install, and an honest comparison table, with no external runtime dependencies

---

### Requirement: Pages Deployment

The landing page deploys to GitHub Pages via a workflow.

#### Scenario: Deploy on push
- GIVEN a push to `main` touching `site/`
- WHEN the pages workflow runs
- THEN it publishes the site to GitHub Pages (when Pages source is set to GitHub Actions)

## MODIFIED

(None)

## REMOVED

(None)
