/**
 * Deterministic idle-streak tracking over an injected cloud-usage feed.
 *
 * The loop records, per resource, how many *consecutive* observations have been
 * idle (utilization at or below a threshold) in a durable `StateStore`. Nothing
 * here talks to a network or an LLM; the usage feed is the only external
 * boundary and is injected. A resource is flagged only once its idle streak
 * reaches `minStreak` — the grace period that prevents a single quiet sample
 * from triggering a remediation proposal.
 */

/** A single point-in-time usage reading for one cloud resource. */
export interface ResourceUsage {
  id: string;
  /** fractional utilization in [0, 1] over the observation window */
  utilization: number;
  /** estimated monthly cost in dollars */
  monthlyCost: number;
}

/** The injected boundary that supplies the current usage snapshot. */
export interface UsageSource {
  current(): Promise<ResourceUsage[]>;
}

/** Resource id → number of consecutive idle observations. */
export type Streaks = Record<string, number>;

/**
 * Advance the idle-streak counters for one observation. For each resource in
 * `usage`: if its utilization is at or below `idleThreshold`, its streak is the
 * previous streak (or 0) plus one; otherwise the streak resets to 0. Resources
 * absent from `usage` are dropped (they no longer exist / are no longer
 * observed). Returns a NEW object; the input is never mutated.
 */
export function updateStreaks(
  streaks: Streaks,
  usage: ResourceUsage[],
  idleThreshold: number,
): Streaks {
  const next: Streaks = {};
  for (const resource of usage) {
    if (resource.utilization <= idleThreshold) {
      const prev = streaks[resource.id] ?? 0;
      next[resource.id] = prev + 1;
    } else {
      next[resource.id] = 0;
    }
  }
  return next;
}

/** A resource whose idle streak has reached the flag threshold. */
export interface IdleResource {
  id: string;
  streak: number;
  monthlyCost: number;
}

/**
 * Resources whose idle streak has reached `minStreak`, sorted by monthly cost
 * descending (most expensive idle resource first). Only resources present in
 * the current `usage` snapshot are considered.
 */
export function idleResources(
  streaks: Streaks,
  usage: ResourceUsage[],
  minStreak: number,
): IdleResource[] {
  const costById = new Map<string, number>();
  for (const resource of usage) {
    costById.set(resource.id, resource.monthlyCost);
  }

  const idle: IdleResource[] = [];
  for (const resource of usage) {
    const streak = streaks[resource.id] ?? 0;
    if (streak >= minStreak) {
      idle.push({
        id: resource.id,
        streak,
        monthlyCost: costById.get(resource.id) ?? resource.monthlyCost,
      });
    }
  }

  return idle.sort((a, b) => b.monthlyCost - a.monthlyCost);
}
