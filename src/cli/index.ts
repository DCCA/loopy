#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { add } from "./commands/add.js";
import { renderList } from "./commands/list.js";
import { run } from "./commands/run.js";

const HELP = `loopy — reusable automation loops for your repo

Usage:
  loopy add <loop>     Scaffold a ready-to-run workflow for a loop (1-click import)
  loopy list           List available loops
  loopy run <loop>     Run a loop end-to-end (used by the scaffolded workflow)
  loopy help           Show this help

Examples:
  npx loopy add dep-updates
  npx loopy list
`;

/** Parse argv (excluding node + script) and execute. Returns an exit code. */
export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  switch (command) {
    case "add": {
      const loopId = rest[0];
      if (!loopId) {
        console.error("usage: loopy add <loop>");
        return 1;
      }
      try {
        const result = await add(loopId);
        console.log(`Added ${result.path}`);
        console.log(`Configure these secrets in your repo: ${result.secrets.join(", ")}`);
        console.log(`Then commit the workflow — the ${result.loopId} loop is live.`);
        return 0;
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        return 1;
      }
    }

    case "list":
      console.log(renderList());
      return 0;

    case "run": {
      const loopId = rest[0];
      if (!loopId) {
        console.error("usage: loopy run <loop>");
        return 1;
      }
      try {
        const outcome = await run(loopId);
        if (!outcome.ran) {
          console.error(outcome.message ?? "loop did not run");
          return 1;
        }
        console.log(`${loopId}: ${outcome.run?.status} → ${outcome.publish?.status}`);
        return 0;
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        return 1;
      }
    }

    case "help":
    case "--help":
    case "-h":
    case undefined:
      console.log(HELP);
      return command === undefined ? 1 : 0;

    default:
      console.error(`unknown command "${command}". Run "loopy help".`);
      return 1;
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err: unknown) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    },
  );
}
