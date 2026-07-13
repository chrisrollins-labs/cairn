import type { QueryExecutor, QueryResult } from "@/core/db/executor";

/**
 * A scripted QueryExecutor for tests: queue the rows each query should return
 * and inspect the recorded calls afterward. Mirrors the production seam exactly,
 * so the pg stores are tested with no database (mirrors the rag sibling).
 */
export class ScriptedExecutor implements QueryExecutor {
  readonly calls: { text: string; params?: unknown[] }[] = [];
  private readonly queue: unknown[][];

  constructor(results: unknown[][] = []) {
    this.queue = [...results];
  }

  push(rows: unknown[]): void {
    this.queue.push(rows);
  }

  async query<T>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    this.calls.push({ text, ...(params ? { params } : {}) });
    const rows = (this.queue.shift() ?? []) as T[];
    return { rows };
  }

  /** Collapse a recorded SQL string to single spaces for stable matching. */
  sqlAt(i: number): string {
    return (this.calls[i]?.text ?? "").replace(/\s+/g, " ").trim();
  }
}
