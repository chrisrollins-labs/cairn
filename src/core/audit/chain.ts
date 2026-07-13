import type { Clock } from "@/shared/clock";
import { GENESIS_HASH } from "@/shared/hash";
import type { AuditEvent, AuditEventType, AuditMetadata } from "./event";
import type { AuditLog } from "./log";
import { hashEvent } from "./preimage";
import type { AuditStore } from "./store";

export interface AppendInput {
  readonly ownerId: string;
  readonly type: AuditEventType;
  readonly subjectId: string;
  readonly metadata: AuditMetadata;
}

export interface ChainVerification {
  /** True only if every link recomputes and every seq/prevHash lines up. */
  readonly ok: boolean;
  /** Number of events examined. */
  readonly length: number;
  /** The hash of the last event, or null for an empty chain. */
  readonly headHash: string | null;
  /** The seq of the first event that failed, if any. */
  readonly brokenAt?: number;
  /** A human-readable reason for the first failure, if any. */
  readonly reason?: string;
}

/**
 * The tamper-evident audit chain (ADR-002).
 *
 * Like a cairn - a trail marker built by stacking stones - each event rests on
 * the one below it: its hash folds in the previous event's hash. Alter, drop,
 * or reorder a single event and every hash from that point on stops matching,
 * so `verify` can point at exactly where the chain was disturbed.
 *
 * The chain writes nothing but audit events. It never decides whether an action
 * is allowed - the domain services do that - it only makes the sequence of
 * actions provable after the fact.
 */
export class AuditChain implements AuditLog {
  constructor(
    private readonly store: AuditStore,
    private readonly clock: Clock,
  ) {}

  async append(input: AppendInput): Promise<AuditEvent> {
    const head = await this.store.head(input.ownerId);
    const seq = head ? head.seq + 1 : 1;
    const prevHash = head ? head.hash : GENESIS_HASH;

    const fields = {
      ownerId: input.ownerId,
      seq,
      at: this.clock(),
      type: input.type,
      subjectId: input.subjectId,
      metadata: input.metadata,
      prevHash,
    };

    const event: AuditEvent = { ...fields, hash: hashEvent(fields) };
    await this.store.append(event);
    return event;
  }

  async list(ownerId: string): Promise<AuditEvent[]> {
    return this.store.list(ownerId);
  }

  /**
   * Re-derive every link from the raw rows and confirm the chain is intact.
   * Read-only: verification never writes, so checking the chain can never
   * change it. Uses the exact same `hashEvent` the writer used.
   */
  async verify(ownerId: string): Promise<ChainVerification> {
    const events = await this.store.list(ownerId);

    let prevHash = GENESIS_HASH;
    for (let i = 0; i < events.length; i++) {
      const e = events[i]!;
      const expectedSeq = i + 1;

      if (e.seq !== expectedSeq) {
        return fail(events.length, e.seq, `expected seq ${expectedSeq}, found ${e.seq}`);
      }
      if (e.prevHash !== prevHash) {
        return fail(events.length, e.seq, "prevHash does not match the previous event's hash");
      }

      const recomputed = hashEvent({
        ownerId: e.ownerId,
        seq: e.seq,
        at: e.at,
        type: e.type,
        subjectId: e.subjectId,
        metadata: e.metadata,
        prevHash: e.prevHash,
      });
      if (recomputed !== e.hash) {
        return fail(events.length, e.seq, "stored hash does not match recomputed hash (row was altered)");
      }

      prevHash = e.hash;
    }

    return {
      ok: true,
      length: events.length,
      headHash: events.length > 0 ? events[events.length - 1]!.hash : null,
    };
  }
}

function fail(length: number, brokenAt: number, reason: string): ChainVerification {
  return { ok: false, length, headHash: null, brokenAt, reason };
}
