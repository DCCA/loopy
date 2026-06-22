import { describe, expect, it } from "vitest";
import { runLoop, silentLogger, type RunContext } from "../../src/core/index.js";
import {
  createKbGapLoop,
  type ArticleWriter,
  type DocChange,
  type KbGapConfig,
  type KbGapServices,
} from "../../loops/kb-gap/index.js";
import {
  findGaps,
  normalizeTopic,
  type Ticket,
} from "../../loops/kb-gap/hooks/gaps.js";

describe("normalizeTopic", () => {
  it("lowercases, trims, collapses whitespace and strips trailing punctuation", () => {
    expect(normalizeTopic("  How   do I  Reset my Password?  ")).toBe("how do i reset my password");
    expect(normalizeTopic("Billing!!!")).toBe("billing");
    expect(normalizeTopic("Login")).toBe("login");
  });
});

describe("findGaps", () => {
  const t = (id: string, question: string, topic?: string): Ticket => ({ id, question, topic });

  it("returns nothing for an empty ticket list", () => {
    expect(findGaps([], [], 1)).toEqual([]);
  });

  it("groups by normalized question and applies the threshold", () => {
    const tickets = [
      t("1", "How do I reset my password?"),
      t("2", "how do i reset my password"),
      t("3", "How do I reset my password"),
      t("4", "Where is billing?"),
    ];
    const gaps = findGaps(tickets, [], 3);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.topic).toBe("how do i reset my password");
    expect(gaps[0]?.count).toBe(3);
    expect(gaps[0]?.tickets).toHaveLength(3);
  });

  it("prefers an explicit topic over the question", () => {
    const tickets = [
      t("1", "totally different wording", "refunds"),
      t("2", "another phrasing entirely", "Refunds"),
    ];
    const gaps = findGaps(tickets, [], 2);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.topic).toBe("refunds");
  });

  it("excludes topics already covered (case-insensitively)", () => {
    const tickets = [t("1", "login", "login"), t("2", "login", "login")];
    expect(findGaps(tickets, ["Login"], 2)).toEqual([]);
  });

  it("sorts by count desc then topic asc", () => {
    const tickets = [
      t("1", "alpha", "alpha"),
      t("2", "alpha", "alpha"),
      t("3", "beta", "beta"),
      t("4", "beta", "beta"),
      t("5", "beta", "beta"),
      t("6", "gamma", "gamma"),
      t("7", "gamma", "gamma"),
    ];
    const gaps = findGaps(tickets, [], 2);
    expect(gaps.map((g) => g.topic)).toEqual(["beta", "alpha", "gamma"]);
  });
});

const config: KbGapConfig = { kbDir: "docs/kb", minTickets: 2 };
const guardrails = { pathAllowlist: ["docs/**"], maxFiles: 20, skipIfOpenPr: true };
const trigger = { type: "manual" } as const;
const ctx = (): RunContext => ({ repoRoot: "/tmp/repo", logger: silentLogger });

function services(
  tickets: Ticket[],
  covered: string[],
  articleWriter: ArticleWriter,
): KbGapServices {
  return {
    tickets: { listResolved: async () => tickets },
    coveredTopics: async () => covered,
    articleWriter,
  };
}

describe("kb-gap loop", () => {
  const gapTickets: Ticket[] = [
    { id: "1", question: "How do I reset my password?", resolution: "Use the reset link." },
    { id: "2", question: "how do i reset my password", resolution: "Use the reset link." },
  ];

  it("produces a PR of KB article writes when gaps exist", async () => {
    const writer: ArticleWriter = async (gaps): Promise<DocChange[]> =>
      gaps.map((g) => ({
        path: `docs/kb/${g.topic.replace(/\s+/g, "-")}.md`,
        contents: `# ${g.topic}\n`,
      }));
    const loop = createKbGapLoop(config, guardrails, trigger, services(gapTickets, [], writer));

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");
    expect(result.outputKind).toBe("pull-request");
    const change = result.changes?.[0];
    expect(change?.op).toBe("write");
    expect(change?.path).toBe("docs/kb/how-do-i-reset-my-password.md");
    expect(result.summary).toContain("kb-gap");
  });

  it("reports no work when there are no gaps", async () => {
    const writer: ArticleWriter = async () => {
      throw new Error("writer should not be called when there is no work");
    };
    const loop = createKbGapLoop(
      config,
      guardrails,
      trigger,
      services(gapTickets, ["how do i reset my password"], writer),
    );

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
  });

  it("reports no work when the writer declines every gap", async () => {
    const writer: ArticleWriter = async () => [];
    const loop = createKbGapLoop(config, guardrails, trigger, services(gapTickets, [], writer));

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
  });

  it("fails safe when the writer returns a path outside the allowlist", async () => {
    const writer: ArticleWriter = async () => [
      { path: "src/secrets.ts", contents: "export const x = 1;\n" },
    ];
    const loop = createKbGapLoop(config, guardrails, trigger, services(gapTickets, [], writer));

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("failed");
    expect(result.error?.message).toMatch(/allowlist/);
  });
});
