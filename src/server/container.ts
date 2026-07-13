import { Pool } from "pg";
import { withTenant } from "@/core/db/pg-executor";
import type { RecordsService } from "@/core/records/service";
import { createMemoryService, createPgService, type MemoryService } from "@/core/runtime";
import { runtimeConfig } from "./config";

/**
 * Resolves a RecordsService for the current tenant and runs a unit of work with
 * it. The two backends differ in exactly one way that matters here:
 *
 *  - memory: a process-wide singleton service (the store is in memory, so state
 *    persists across requests within the running server and resets on restart).
 *  - postgres: a fresh service per request, bound to a connection with the
 *    tenancy GUC set, so RLS isolates every query to `userId`.
 *
 * Callers never see the difference — they get a service and a scoped user id.
 */

let memory: MemoryService | null = null;
function memoryService(): MemoryService {
  if (!memory) {
    const config = runtimeConfig();
    memory = createMemoryService({ transport: config.transport, models: config.models });
  }
  return memory;
}

let pool: Pool | null = null;
function pgPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function withService<T>(
  userId: string,
  fn: (service: RecordsService) => Promise<T>,
): Promise<T> {
  const config = runtimeConfig();
  if (config.store === "postgres") {
    return withTenant(pgPool(), userId, (db) =>
      fn(createPgService(db, { transport: config.transport, models: config.models })),
    );
  }
  return fn(memoryService().service);
}
