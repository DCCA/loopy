export interface Ticket {
  id: string;
  question: string;
  resolution?: string;
  topic?: string;
}

export interface TicketSource {
  listResolved(): Promise<Ticket[]>;
}

export interface KbGap {
  topic: string;
  count: number;
  tickets: Ticket[];
}

/**
 * Normalize a free-text string into a stable topic key: lowercased, trimmed,
 * inner whitespace collapsed to single spaces, and trailing punctuation stripped.
 */
export function normalizeTopic(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\s.,!?;:]+$/, "");
}

/**
 * Group resolved tickets by topic and surface the topics that look like a
 * documentation gap.
 *
 * Grouping key is `ticket.topic` when set, otherwise a normalized key derived
 * from the question. A topic is a gap when its ticket count is `>= minTickets`
 * and it is not already in `coveredTopics` (compared case-insensitively).
 *
 * Result is sorted by count descending, then topic ascending.
 */
export function findGaps(tickets: Ticket[], coveredTopics: string[], minTickets: number): KbGap[] {
  const covered = new Set(coveredTopics.map((t) => normalizeTopic(t)));

  const groups = new Map<string, KbGap>();
  for (const ticket of tickets) {
    const key = ticket.topic ? normalizeTopic(ticket.topic) : normalizeTopic(ticket.question);
    if (key.length === 0) continue;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.tickets.push(ticket);
    } else {
      groups.set(key, { topic: key, count: 1, tickets: [ticket] });
    }
  }

  const gaps = [...groups.values()].filter(
    (g) => g.count >= minTickets && !covered.has(g.topic),
  );

  gaps.sort((a, b) => (b.count - a.count) || (a.topic < b.topic ? -1 : a.topic > b.topic ? 1 : 0));
  return gaps;
}
