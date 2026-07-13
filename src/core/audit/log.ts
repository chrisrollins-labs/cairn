import type { AppendInput, ChainVerification } from "./chain";
import type { AuditEvent } from "./event";

/**
 * The audit-log abstraction the domain service depends on. It has two
 * implementations of one protocol (docs/AUDIT.md):
 *
 *  - AuditChain (TypeScript): computes and verifies the chain in the app,
 *    over an in-memory or otherwise app-owned store. The default runtime.
 *  - PgAuditLog (Postgres): the database trigger seals each event and a SQL
 *    function verifies; the app only supplies the semantic fields.
 *
 * The service never needs to know which one it has — it appends events and asks
 * for verification, and either implementation answers.
 */
export interface AuditLog {
  append(input: AppendInput): Promise<AuditEvent>;
  list(ownerId: string): Promise<AuditEvent[]>;
  verify(ownerId: string): Promise<ChainVerification>;
}
