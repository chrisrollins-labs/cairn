/**
 * The domain entities.
 *
 * The relationships encode the review gate directly in the types: an AI flow
 * produces a Draft (proposal) or an Assessment (a separate labeled artifact),
 * never a RecordEntry. A RecordEntry only ever comes into existence through the
 * commit path, which stamps who approved it (ADR-001).
 */

/** Provenance of a single model call, recorded wherever AI output is stored. */
export interface AiOrigin {
  readonly model: string;
  readonly provider: string;
  readonly promptTemplateId: string;
  readonly promptTemplateVersion: number;
  readonly transcriptId: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
}

export type RecordSource = "human" | "ai_reviewed";

/**
 * A committed record. Immutable content addressed by `contentHash` (SHA-256 of
 * the canonical {title, body}), which lets the audit trail reference exactly
 * which bytes were approved without copying them (ADR-003).
 */
export interface RecordEntry {
  readonly id: string;
  readonly ownerId: string;
  readonly title: string;
  readonly body: string;
  readonly source: RecordSource;
  readonly contentHash: string;
  /** Present iff source === "ai_reviewed". */
  readonly ai: AiOrigin | null;
  /** The draft this record was approved from, iff AI-assisted. */
  readonly draftId: string | null;
  /** The user who committed it (the reviewer who approved the draft). */
  readonly approvedBy: string;
  readonly createdAt: number;
}

export type DraftStatus = "pending" | "approved" | "rejected";
export type DraftOrigin = "ai" | "human";

/**
 * A proposal. The AI can create and update these freely; doing so commits
 * nothing a person will see as a record. A draft leaves this table only by an
 * explicit human decision (approve → a record is committed; reject → discarded).
 */
export interface Draft {
  readonly id: string;
  readonly ownerId: string;
  readonly origin: DraftOrigin;
  readonly status: DraftStatus;
  readonly title: string;
  readonly body: string;
  /** Present iff origin === "ai". */
  readonly ai: AiOrigin | null;
  /** The note that seeded an AI draft (the person's own words); "" for human. */
  readonly sourceNote: string;
  readonly createdAt: number;
  readonly decidedAt: number | null;
  readonly resultingRecordId: string | null;
}

/**
 * A separate, versioned, AI-authored artifact about a record. It is never
 * merged into the record's body; it is always labeled AI-generated (ADR-007).
 * A new assessment deactivates the prior active one for that record.
 */
export interface Assessment {
  readonly id: string;
  readonly ownerId: string;
  readonly recordId: string;
  readonly version: number;
  readonly active: boolean;
  readonly body: string;
  readonly ai: AiOrigin;
  readonly label: "ai_generated";
  readonly createdAt: number;
}
