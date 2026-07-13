/**
 * The database seam. Everything that touches Postgres depends on this narrow
 * interface, never on a concrete driver, so the pg stores are unit-testable
 * against a scripted double with no database and no network (mirrors the rag
 * sibling's approach).
 */

export interface QueryResult<T> {
  rows: T[];
}

export interface QueryExecutor {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}
