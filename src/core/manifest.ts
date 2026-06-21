import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { Guardrails, Trigger } from "./types.js";

/** A parsed `loop.yaml` manifest. */
export interface LoopManifest {
  id: string;
  trigger: Trigger;
  guardrails: Guardrails;
  /** loop-specific configuration block, validated by each loop */
  config: Record<string, unknown>;
}

/** Parse a manifest from a YAML string. Throws on invalid input. */
export function parseManifest(source: string): LoopManifest {
  const raw = parse(source) as unknown;
  if (!raw || typeof raw !== "object") {
    throw new Error("loop manifest is empty or not an object");
  }
  const obj = raw as Record<string, unknown>;

  const id = obj["id"];
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("loop manifest requires a non-empty string 'id'");
  }

  return {
    id,
    trigger: normalizeTrigger(obj["trigger"]),
    guardrails: normalizeGuardrails(obj["guardrails"]),
    config: (obj["config"] as Record<string, unknown> | undefined) ?? {},
  };
}

/** Load and parse a manifest from a file path. */
export async function loadManifest(path: string): Promise<LoopManifest> {
  return parseManifest(await readFile(path, "utf8"));
}

function normalizeTrigger(value: unknown): Trigger {
  if (!value || typeof value !== "object") {
    throw new Error("loop manifest requires a 'trigger' object");
  }
  const t = value as Record<string, unknown>;
  const type = t["type"];
  if (type !== "schedule" && type !== "event" && type !== "manual") {
    throw new Error(`invalid trigger.type: ${String(type)}`);
  }
  const trigger: Trigger = { type };
  if (typeof t["cron"] === "string") trigger.cron = t["cron"];
  if (Array.isArray(t["events"])) trigger.events = t["events"].map(String);
  return trigger;
}

function normalizeGuardrails(value: unknown): Guardrails {
  if (value == null) return {};
  if (typeof value !== "object") {
    throw new Error("'guardrails' must be an object");
  }
  const g = value as Record<string, unknown>;
  const guardrails: Guardrails = {};
  if (Array.isArray(g["pathAllowlist"])) {
    guardrails.pathAllowlist = g["pathAllowlist"].map(String);
  }
  if (typeof g["maxFiles"] === "number") guardrails.maxFiles = g["maxFiles"];
  if (typeof g["skipIfOpenPr"] === "boolean") guardrails.skipIfOpenPr = g["skipIfOpenPr"];
  return guardrails;
}
