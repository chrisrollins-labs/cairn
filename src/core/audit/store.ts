import type { AuditEvent } from "./event";

/**
 * The audit persistence seam. The chain logic depends on this narrow interface,
 * never on a concrete database, so it is fully exercised against an in-memory
 * double in tests and behind Postgres in production (ADR-008).
 *
 * `append` must be atomic per owner: two concurrent appends to the same chain
 * must not both read the same head. The in-memory store gets this for free
 * (single-threaded); the Postgres store gets it from a per-owner lock and a
 * unique (owner, seq) constraint (see db/migrations).
 */
export interface AuditStore {
  /** The owner's most recent event, or null if the chain is empty. */
  head(ownerId: string): Promise<AuditEvent | null>;
  /** Persist a fully-formed event. */
  append(event: AuditEvent): Promise<void>;
  /** All of the owner's events, ordered by seq ascending. */
  list(ownerId: string): Promise<AuditEvent[]>;
}
