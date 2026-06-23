export interface ActionItem {
  id: string;
  title: string;
  incidentId: string;
  status: "open" | "done";
  dueIso?: string;
}

export interface Incident {
  id: string;
  title: string;
  rootCause?: string;
  closedIso?: string;
}

export interface IncidentSource {
  incidents(): Promise<Incident[]>;
  actionItems(): Promise<ActionItem[]>;
}

export interface OverdueItem {
  item: ActionItem;
  daysOverdue: number;
}

export interface Recurrence {
  rootCause: string;
  count: number;
  incidentIds: string[];
}

const DAY_MS = 86_400_000;

/** Normalize a root-cause string: lowercased, trimmed, inner whitespace collapsed. */
export function normalizeCause(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Find open action items whose `dueIso` is strictly before `nowIso`.
 *
 * Items without a due date, items already `done`, and items not yet due are
 * excluded. `daysOverdue` is `floor((now - due) / 86400000)` clamped to a
 * minimum of 0. Result is sorted by `daysOverdue` descending.
 */
export function findOverdue(items: ActionItem[], nowIso: string): OverdueItem[] {
  const now = Date.parse(nowIso);

  const overdue: OverdueItem[] = [];
  for (const item of items) {
    if (item.status !== "open") continue;
    if (item.dueIso === undefined) continue;
    const due = Date.parse(item.dueIso);
    if (Number.isNaN(due)) continue;
    if (!(due < now)) continue;
    const daysOverdue = Math.max(0, Math.floor((now - due) / DAY_MS));
    overdue.push({ item, daysOverdue });
  }

  overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
  return overdue;
}

/**
 * Cluster incidents by normalized root cause and surface recurring failures.
 *
 * Incidents without a `rootCause` are skipped. A recurrence is a cause whose
 * incident count is `>= minCount`. Result is sorted by count descending, then
 * cause ascending.
 */
export function findRecurrences(incidents: Incident[], minCount: number): Recurrence[] {
  const groups = new Map<string, Recurrence>();
  for (const incident of incidents) {
    if (incident.rootCause === undefined) continue;
    const cause = normalizeCause(incident.rootCause);
    if (cause.length === 0) continue;
    const existing = groups.get(cause);
    if (existing) {
      existing.count += 1;
      existing.incidentIds.push(incident.id);
    } else {
      groups.set(cause, { rootCause: cause, count: 1, incidentIds: [incident.id] });
    }
  }

  const recurrences = [...groups.values()].filter((r) => r.count >= minCount);
  recurrences.sort(
    (a, b) =>
      b.count - a.count ||
      (a.rootCause < b.rootCause ? -1 : a.rootCause > b.rootCause ? 1 : 0),
  );
  return recurrences;
}
