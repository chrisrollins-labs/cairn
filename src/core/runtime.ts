import { AiGateway, type GatewayModelConfig } from "@/core/ai/gateway";
import type { AiTransport } from "@/core/ai/transport";
import { AuditChain } from "@/core/audit/chain";
import { RecordsService } from "@/core/records/service";
import type { Stores } from "@/core/store/interfaces";
import { systemClock, uuidGen, type Clock, type IdGen } from "@/shared/clock";

/**
 * The composition root. It wires the gateway, the audit chain, and the service
 * over a set of stores the caller supplies — so choosing in-memory vs Postgres
 * is a decision made once, at the edge, and nothing downstream changes (ADR-009).
 * Time and identity default to the system implementations but are injectable so
 * the whole service can run deterministically under test.
 */
export interface ServiceConfig {
  readonly stores: Stores;
  readonly transport: AiTransport;
  readonly models: GatewayModelConfig;
  readonly clock?: Clock;
  readonly newId?: IdGen;
}

export function createService(config: ServiceConfig): RecordsService {
  const clock = config.clock ?? systemClock;
  const newId = config.newId ?? uuidGen;

  const gateway = new AiGateway({
    transport: config.transport,
    transcripts: config.stores.transcripts,
    clock,
    newId,
    models: config.models,
  });

  const chain = new AuditChain(config.stores.audit, clock);

  return new RecordsService({ stores: config.stores, gateway, chain, clock, newId });
}
