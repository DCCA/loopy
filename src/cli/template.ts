import type { CatalogEntry } from "./catalog.js";

/** Render a ready-to-run GitHub Actions workflow for a loop. */
export function renderWorkflow(entry: CatalogEntry): string {
  const on = renderTrigger(entry);
  const permissions =
    entry.output === "comment"
      ? "  pull-requests: write\n  contents: read"
      : "  contents: write\n  pull-requests: write";
  const env = entry.secrets
    .map((s) => `          ${s}: \${{ secrets.${s} }}`)
    .concat(["          GITHUB_REPOSITORY: ${{ github.repository }}"])
    .join("\n");

  return `# Added by \`loopy add ${entry.id}\`. Ready to run.
name: loopy ${entry.id}

on:
${on}

permissions:
${permissions}

jobs:
  ${entry.id}:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Run the ${entry.id} loop
        run: npx -y loopy run ${entry.id}
        env:
${env}
`;
}

function renderTrigger(entry: CatalogEntry): string {
  if (entry.trigger.kind === "event") {
    const events = entry.trigger.events ?? ["pull_request"];
    return events.map((e) => `  ${e}:`).join("\n");
  }
  const cron = entry.trigger.cron ?? "0 6 * * 1";
  return `  schedule:\n    - cron: "${cron}"\n  workflow_dispatch: {}`;
}
