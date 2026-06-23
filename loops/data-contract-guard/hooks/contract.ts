/**
 * The schema-contract model: a schema is a set of named fields. Diffing two
 * schemas classifies each change as breaking (removed / type-changed / a new
 * required field) or additive (a new optional field). The source is the
 * injected boundary that yields the current schema.
 */

export interface Field {
  name: string;
  type: string;
  required: boolean;
}

export interface Schema {
  fields: Field[];
}

export interface SchemaSource {
  current(): Promise<Schema>;
}

export interface Change {
  kind: "removed" | "type-changed" | "required-added" | "added";
  field: string;
  detail?: string;
}

/** Index a schema's fields by name (last write wins on duplicates). */
function byName(schema: Schema): Map<string, Field> {
  const map = new Map<string, Field>();
  for (const f of schema.fields) map.set(f.name, f);
  return map;
}

/**
 * Classify the changes from `prev` to `next`:
 * - a removed field → "removed" (breaking);
 * - a field whose type changed → "type-changed" (breaking);
 * - a NEW required field → "required-added" (breaking);
 * - a new optional field → "added" (additive).
 * Results are sorted by field name.
 */
export function diffSchema(prev: Schema, next: Schema): Change[] {
  const before = byName(prev);
  const after = byName(next);
  const changes: Change[] = [];

  for (const [name, oldField] of before) {
    const newField = after.get(name);
    if (!newField) {
      changes.push({ kind: "removed", field: name });
      continue;
    }
    if (newField.type !== oldField.type) {
      changes.push({
        kind: "type-changed",
        field: name,
        detail: `${oldField.type} → ${newField.type}`,
      });
    }
  }

  for (const [name, newField] of after) {
    if (before.has(name)) continue;
    changes.push({
      kind: newField.required ? "required-added" : "added",
      field: name,
    });
  }

  return changes.sort((a, b) => (a.field < b.field ? -1 : a.field > b.field ? 1 : 0));
}

/** A change set is breaking if any change is not purely additive. */
export function isBreaking(changes: Change[]): boolean {
  return changes.some((c) => c.kind !== "added");
}
