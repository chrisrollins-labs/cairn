import type { JsonValue } from "@/shared/canonical";

/**
 * The audit event.
 *
 * Every meaningful state change appends one event to the actor's chain. The
 * metadata is deliberately IDs, enums, and counts only - never a record's title
 * or body (ADR-003). The audit log proves *that* something happened and in what
 * order; it is not a second copy of the data it describes.
 */

export type AuditEventType =
  | "draft.proposed" // an AI (or a person) proposed a draft - nothing user-visible was committed
  | "draft.edited" // a person changed a pending draft before deciding on it
  | "draft.rejected" // a person declined a draft; no record was created
  | "record.committed" // a person approved a draft (or wrote directly): a record now exists
  | "assessment.generated"; // the AI produced a separate, labeled artifact about a record

export type AuditMetadata = { readonly [key: string]: JsonValue };

export interface AuditEvent {
  /** The tenant this chain belongs to. Chains are strictly per-user. */
  readonly ownerId: string;
  /** 1-based, contiguous position within this owner's chain. */
  readonly seq: number;
  /** Epoch milliseconds the event was recorded (from the injected clock). */
  readonly at: number;
  readonly type: AuditEventType;
  /** The id of the record/draft/assessment this event is about. */
  readonly subjectId: string;
  /** IDs / enums / counts only. Never record content. */
  readonly metadata: AuditMetadata;
  /** The previous event's hash, or GENESIS_HASH for seq 1. */
  readonly prevHash: string;
  /** SHA-256 of this event's preimage (see preimage.ts). */
  readonly hash: string;
}

/** The fields that determine an event's hash - everything except the hash. */
export type AuditEventPreimageFields = Omit<AuditEvent, "hash">;
