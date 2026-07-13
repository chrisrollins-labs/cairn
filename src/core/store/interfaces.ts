import type { TranscriptStore } from "@/core/ai/transcript";
import type { AuditStore } from "@/core/audit/store";
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

export interface Stores {
  readonly records: RecordStore;
  readonly drafts: DraftStore;
  readonly assessments: AssessmentStore;
  readonly transcripts: TranscriptStore;
  readonly audit: AuditStore;
}
