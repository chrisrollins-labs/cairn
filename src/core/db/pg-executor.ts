import type { Pool } from "pg";
import type { QueryExecutor, QueryResult } from "./executor";

/**
 * The one place the pg driver is imported. Adapts a node-postgres Pool to the
 * QueryExecutor seam so the rest of the codebase never sees `pg`.
 */
export function createPgExecutor(pool: Pool): QueryExecutor {
  return {
    async query<T>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
      const result = await pool.query(text, params as unknown[]);
      return { rows: result.rows as T[] };
    },
  };
}

/**
 * Run a unit of work on a single connection with the tenancy GUC set, so RLS
 * scopes every query to `userId` (ADR-006). This is the request-scoped pattern:
 * check out a connection, pin `app.user_id`, do the work, release. Because
 * `set_config(..., true)` is transaction/session-local to that connection, one
 * tenant's requests can never read another's rows - the database enforces it,
 * not the application.
 */
export async function withTenant<T>(
  pool: Pool,
  userId: string,
  fn: (db: QueryExecutor) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("select set_config('app.user_id', $1, true)", [userId]);
    const db: QueryExecutor = {
      async query<R>(text: string, params?: unknown[]): Promise<QueryResult<R>> {
        const result = await client.query(text, params as unknown[]);
        return { rows: result.rows as R[] };
      },
    };
    return await fn(db);
  } finally {
    client.release();
  }
}
