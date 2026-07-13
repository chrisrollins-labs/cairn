/**
 * Canonical JSON serialization.
 *
 * The audit hash chain (ADR-002) hashes over a byte string that must be
 * reproducible by anyone re-deriving it - including the SQL implementation in
 * db/migrations. Plain `JSON.stringify` is not stable: object key order follows
 * insertion order, so two equal objects can serialize differently and hash
 * differently. `canonicalize` fixes an ordering (keys sorted lexicographically,
 * recursively) and forbids the values JSON can't round-trip, so the same
 * logical metadata always produces the same bytes.
 *
 * The accepted shape is deliberately narrow: audit metadata is IDs, enums, and
 * small numbers - never record content - so we only need JSON scalars, arrays,
 * and plain objects.
 */

export type JsonScalar = string | number | boolean | null;
export type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };

export function canonicalize(value: JsonValue): string {
  if (value === null) return "null";

  const t = typeof value;
  if (t === "string") return JSON.stringify(value);
  if (t === "boolean") return value ? "true" : "false";
  if (t === "number") {
    if (!Number.isFinite(value as number)) {
      throw new Error(`canonicalize: non-finite number ${String(value)}`);
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  if (t === "object") {
    const obj = value as { [key: string]: JsonValue };
    const keys = Object.keys(obj).sort();
    const parts = keys.map((k) => {
      const v = obj[k];
      if (v === undefined) {
        throw new Error(`canonicalize: undefined value at key ${k}`);
      }
      return `${JSON.stringify(k)}:${canonicalize(v)}`;
    });
    return `{${parts.join(",")}}`;
  }

  throw new Error(`canonicalize: unsupported value of type ${t}`);
}
