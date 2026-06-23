import { describe, expect, it } from "vitest";
import { runLoop, silentLogger, type RunContext } from "../../src/core/index.js";
import { createI18nDriftLoop, type I18nConfig } from "../../loops/i18n-drift/index.js";
import {
  computeDrift,
  findMissing,
  findOrphaned,
  type LocaleKeys,
  type LocaleSource,
} from "../../loops/i18n-drift/hooks/i18n.js";

function source(defaultKeys: string[], locales: LocaleKeys[]): LocaleSource {
  return {
    defaultKeys: async () => defaultKeys,
    locales: async () => locales,
  };
}

const config: I18nConfig = {
  reportPath: "reports/i18n-status.md",
};

const guardrails = { pathAllowlist: ["reports/**"], maxFiles: 5, skipIfOpenPr: true };
const trigger = { type: "manual" as const };
const ctx = (): RunContext => ({ repoRoot: "/tmp/loopy-i18n-drift", logger: silentLogger });

describe("findMissing", () => {
  it("returns keys in default but not in locale, sorted", () => {
    expect(findMissing(["b", "a", "c"], ["a"])).toEqual(["b", "c"]);
  });

  it("returns nothing when the locale has every default key", () => {
    expect(findMissing(["a", "b"], ["b", "a", "extra"])).toEqual([]);
  });
});

describe("findOrphaned", () => {
  it("returns keys in locale but not in default, sorted", () => {
    expect(findOrphaned(["a"], ["z", "a", "m"])).toEqual(["m", "z"]);
  });

  it("returns nothing when the locale has no extra keys", () => {
    expect(findOrphaned(["a", "b"], ["a"])).toEqual([]);
  });
});

describe("computeDrift", () => {
  it("returns only drifted locales, in input order", () => {
    const drift = computeDrift(
      ["a", "b"],
      [
        { locale: "fr", keys: ["a", "b"] },
        { locale: "de", keys: ["a"] },
        { locale: "es", keys: ["a", "b", "x"] },
      ],
    );
    expect(drift.map((d) => d.locale)).toEqual(["de", "es"]);
    expect(drift[0]!.missing).toEqual(["b"]);
    expect(drift[0]!.orphaned).toEqual([]);
    expect(drift[1]!.missing).toEqual([]);
    expect(drift[1]!.orphaned).toEqual(["x"]);
  });

  it("returns nothing when all locales are complete", () => {
    expect(
      computeDrift(["a", "b"], [{ locale: "fr", keys: ["a", "b"] }]),
    ).toEqual([]);
  });
});

describe("i18n-drift loop", () => {
  it("produces a PR writing the report when a locale is missing a key", async () => {
    const loop = createI18nDriftLoop(config, guardrails, trigger, {
      source: source(
        ["home.title", "home.subtitle"],
        [
          { locale: "fr", keys: ["home.title", "home.subtitle"] },
          { locale: "de", keys: ["home.title"] },
        ],
      ),
    });

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");
    expect(result.outputKind).toBe("pull-request");
    const change = result.changes?.[0];
    expect(change?.path).toBe("reports/i18n-status.md");
    expect(change?.op).toBe("write");
    const contents = change && change.op === "write" ? change.contents : "";
    expect(contents).toContain("de");
    expect(contents).toContain("home.subtitle");
    expect(result.summary).toContain("de");
    expect(result.summary).toContain("Add/translate the missing keys");
  });

  it("reports no work when all locales are complete", async () => {
    const loop = createI18nDriftLoop(config, guardrails, trigger, {
      source: source(
        ["home.title"],
        [
          { locale: "fr", keys: ["home.title"] },
          { locale: "de", keys: ["home.title"] },
        ],
      ),
    });

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
    expect(result.changes).toBeUndefined();
  });
});
