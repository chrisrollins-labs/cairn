import type { TranscriptStore } from "@/core/ai/transcript";
import type { Assessment, Draft, DraftStatus, RecordEntry } from "@/core/records/types";

/**
 * The persistence seams, one narrow interface per aggregate. Everything that
 * touches storage depends on these, never on a concrete database. The default
 * runtime wires in-memory implementations (zero infrastructure); Postgres is a
 * drop-in behind the same interfaces (ADR-009).
 */

export interface RecordStore {
  insert(record: RecordEntry): Promise<void>;
  get(ownerId: string, id: string): Promise<RecordEntry | null>;
  /** Newest first. */
  listByOwner(ownerId: string): Promise<RecordEntry[]>;
}

export interface DraftStore {
  insert(draft: Draft): Promise<void>;
  get(ownerId: string, id: string): Promise<Draft | null>;
  update(draft: Draft): Promise<void>;
  /** Newest first; optionally filtered by status. */
  listByOwner(ownerId: string, status?: DraftStatus): Promise<Draft[]>;
}

export interface AssessmentStore {
  insert(assessment: Assessment): Promise<void>;
  /** Flip the current active assessment (if any) for a record to inactive. */
  deactivateActiveFor(ownerId: string, recordId: string): Promise<void>;
  /** Newest first. */
  listByRecord(ownerId: string, recordId: string): Promise<Assessment[]>;
}

/**
 * The record-domain stores. The audit log is a separate abstraction
 * (@/core/audit/log) because, in the Postgres backend, the database — not a
 * store — owns the chain; keeping it out of this bundle lets both backends
 * share one shape.
 */
export interface Stores {
  readonly records: RecordStore;
  readonly drafts: DraftStore;
  readonly assessments: AssessmentStore;
  readonly transcripts: TranscriptStore;
}
