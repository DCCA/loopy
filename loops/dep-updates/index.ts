import type {
  ActResult,
  DetectResult,
  Guardrails,
  Loop,
  LoopManifest,
  RunContext,
  Trigger,
} from "../../src/core/index.js";
import type { RegistryClient } from "./hooks/registry.js";
import { computeUpdates, summarizeUpdates, type ComputeOptions } from "./hooks/updates.js";

export interface DepUpdatesConfig {
  /** path to the package manifest (default "package.json") */
  manifestPath: string;
  /** include devDependencies (default true) */
  includeDev: boolean;
  /** apply major updates too (default false) */
  allowMajor: boolean;
}

export interface DepUpdatesServices {
  registry: RegistryClient;
}

export function createDepUpdatesLoop(
  config: DepUpdatesConfig,
  guardrails: Guardrails,
  trigger: Trigger,
  services: DepUpdatesServices,
): Loop {
  const options: ComputeOptions = {
    manifestPath: config.manifestPath,
    includeDev: config.includeDev,
    allowMajor: config.allowMajor,
  };

  return {
    id: "dep-updates",
    trigger,
    guardrails,

    async detect(ctx: RunContext): Promise<DetectResult> {
      const result = await computeUpdates(ctx.repoRoot, services.registry, options);
      if (result.applied.length === 0) {
        const reason =
          result.skippedMajor.length > 0
            ? "only major updates available (excluded by default)"
            : "all dependencies up to date";
        return { workNeeded: false, reason };
      }
      return {
        workNeeded: true,
        reason: `${result.applied.length} update(s) available`,
        affected: result.applied.map((u) => u.name),
      };
    },

    async act(ctx: RunContext): Promise<ActResult> {
      const result = await computeUpdates(ctx.repoRoot, services.registry, options);
      const contents = JSON.stringify(result.manifest, null, 2) + "\n";
      return {
        changes: [{ path: config.manifestPath, op: "write", contents }],
        summary: summarizeUpdates(result),
      };
    },
  };
}

export function createDepUpdatesLoopFromManifest(
  manifest: LoopManifest,
  services: DepUpdatesServices,
): Loop {
  const c = manifest.config;
  const config: DepUpdatesConfig = {
    manifestPath: typeof c["manifestPath"] === "string" ? c["manifestPath"] : "package.json",
    includeDev: c["includeDev"] !== false,
    allowMajor: c["allowMajor"] === true,
  };
  return createDepUpdatesLoop(config, manifest.guardrails, manifest.trigger, services);
}

export type { RegistryClient } from "./hooks/registry.js";
export { createNpmRegistryClient } from "./hooks/registry.js";
