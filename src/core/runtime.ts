import { AiGateway, type GatewayModelConfig } from "@/core/ai/gateway";
import type { AiTransport } from "@/core/ai/transport";
import { AuditChain } from "@/core/audit/chain";
import type { AuditLog } from "@/core/audit/log";
import type { QueryExecutor } from "@/core/db/executor";
import { RecordsService } from "@/core/records/service";
import type { Stores } from "@/core/store/interfaces";
import { createMemoryAuditStore, createMemoryStores } from "@/core/store/memory";
import { createPgStores, PgAuditLog } from "@/core/store/pg";
import { systemClock, uuidGen, type Clock, type IdGen } from "@/shared/clock";

/**
 * The composition root. It wires the gateway, an audit log, and the service over
 * a set of stores — so choosing in-memory vs Postgres is a decision made once,
 * at the edge, and nothing downstream changes (ADR-009). Time and identity are
 * injectable so the whole service can run deterministically under test.
 */
export interface ServiceConfig {
  readonly stores: Stores;
  readonly auditLog: AuditLog;
  readonly transport: AiTransport;
  readonly models: GatewayModelConfig;
  readonly clock: Clock;
  readonly newId: IdGen;
}

export function createService(config: ServiceConfig): RecordsService {
  const gateway = new AiGateway({
    transport: config.transport,
    transcripts: config.stores.transcripts,
    clock: config.clock,
    newId: config.newId,
    models: config.models,
  });

  return new RecordsService({
    stores: config.stores,
    gateway,
    auditLog: config.auditLog,
    clock: config.clock,
    newId: config.newId,
  });
}

export interface MemoryServiceOptions {
  readonly transport: AiTransport;
  readonly models: GatewayModelConfig;
  readonly clock?: Clock;
  readonly newId?: IdGen;
}

export interface MemoryService {
  readonly service: RecordsService;
  readonly stores: Stores;
  readonly auditLog: AuditLog;
}

/**
 * The zero-infrastructure backend: in-memory stores and the TypeScript audit
 * chain. This is the default runtime and the one the test suite drives.
 */
export function createMemoryService(options: MemoryServiceOptions): MemoryService {
  const clock = options.clock ?? systemClock;
  const newId = options.newId ?? uuidGen;
  const stores = createMemoryStores();
  const auditLog = new AuditChain(createMemoryAuditStore(), clock);
  const service = createService({
    stores,
    auditLog,
    transport: options.transport,
    models: options.models,
    clock,
    newId,
  });
  return { service, stores, auditLog };
}

export interface PgServiceOptions {
  readonly transport: AiTransport;
  readonly models: GatewayModelConfig;
  readonly clock?: Clock;
  readonly newId?: IdGen;
}

/**
 * The Postgres backend, built over a tenant-scoped executor (see pg-executor
 * withTenant). The database seals the audit chain and enforces RLS; the service
 * code above is byte-for-byte the same as the in-memory path — only the stores
 * and audit log differ (ADR-009).
 */
export function createPgService(db: QueryExecutor, options: PgServiceOptions): RecordsService {
  const clock = options.clock ?? systemClock;
  const newId = options.newId ?? uuidGen;
  return createService({
    stores: createPgStores(db),
    auditLog: new PgAuditLog(db, clock),
    transport: options.transport,
    models: options.models,
    clock,
    newId,
  });
}
