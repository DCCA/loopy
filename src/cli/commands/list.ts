import { CATALOG, needsAi } from "../catalog.js";

/** Render the loop catalog as human-readable text. */
export function renderList(): string {
  const lines = ["Available loops:", ""];
  for (const e of CATALOG) {
    const trig =
      e.trigger.kind === "event"
        ? `on ${(e.trigger.events ?? []).join(", ")}`
        : `schedule ${e.trigger.cron}`;
    const turnkey = needsAi(e) ? "needs OPENROUTER_API_KEY" : "turnkey";
    lines.push(`  ${e.id}`);
    lines.push(`    ${e.description}`);
    lines.push(`    trigger: ${trig} · output: ${e.output} · ${turnkey}`);
    lines.push(`    secrets: ${e.secrets.join(", ")}`);
    lines.push("");
  }
  lines.push('Import any of these with: loopy add <loop>');
  return lines.join("\n");
}
