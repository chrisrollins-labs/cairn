import type { Transcript, TranscriptStore } from "@/core/ai/transcript";
import type { AuditEvent } from "@/core/audit/event";
import type { AuditStore } from "@/core/audit/store";
import type { Assessment, Draft, DraftStatus, RecordEntry } from "@/core/records/types";
import type { AssessmentStore, DraftStore, RecordStore, Stores } from "./interfaces";

/**
 * In-memory stores: the zero-infrastructure default and the test double in one
 * (ADR-009). Arrays are kept in insertion order, which is chronological, so
 * "newest first" is just a reverse and never depends on timestamp ties.
 *
 * Isolation is enforced the same way it is in Postgres, only here it is a
 * `where ownerId = ?` in code: every read is filtered by owner, so one tenant
 * can never see another's rows.
 */

class MemoryRecordStore implements RecordStore {
  private readonly rows: RecordEntry[] = [];

  async insert(record: RecordEntry): Promise<void> {
    this.rows.push(record);
  }

  async get(ownerId: string, id: string): Promise<RecordEntry | null> {
    return this.rows.find((r) => r.ownerId === ownerId && r.id === id) ?? null;
  }

  async listByOwner(ownerId: string): Promise<RecordEntry[]> {
    return this.rows.filter((r) => r.ownerId === ownerId).reverse();
  }
}

class MemoryDraftStore implements DraftStore {
  private readonly rows: Draft[] = [];

  async insert(draft: Draft): Promise<void> {
    this.rows.push(draft);
  }

  async get(ownerId: string, id: string): Promise<Draft | null> {
    return this.rows.find((d) => d.ownerId === ownerId && d.id === id) ?? null;
  }

  async update(draft: Draft): Promise<void> {
    const i = this.rows.findIndex((d) => d.ownerId === draft.ownerId && d.id === draft.id);
    if (i === -1) throw new Error(`draft ${draft.id} not found for update`);
    this.rows[i] = draft;
  }

  async listByOwner(ownerId: string, status?: DraftStatus): Promise<Draft[]> {
    return this.rows
      .filter((d) => d.ownerId === ownerId && (status === undefined || d.status === status))
      .reverse();
  }
}

class MemoryAssessmentStore implements AssessmentStore {
  private readonly rows: Assessment[] = [];

  async insert(assessment: Assessment): Promise<void> {
    this.rows.push(assessment);
  }

  async deactivateActiveFor(ownerId: string, recordId: string): Promise<void> {
    for (let i = 0; i < this.rows.length; i++) {
      const a = this.rows[i]!;
      if (a.ownerId === ownerId && a.recordId === recordId && a.active) {
        this.rows[i] = { ...a, active: false };
      }
    }
  }

  async listByRecord(ownerId: string, recordId: string): Promise<Assessment[]> {
    return this.rows
      .filter((a) => a.ownerId === ownerId && a.recordId === recordId)
      .reverse();
  }
}

class MemoryTranscriptStore implements TranscriptStore {
  private readonly rows: Transcript[] = [];

  async insert(transcript: Transcript): Promise<void> {
    this.rows.push(transcript);
  }

  async get(ownerId: string, id: string): Promise<Transcript | null> {
    return this.rows.find((t) => t.ownerId === ownerId && t.id === id) ?? null;
  }
}

class MemoryAuditStore implements AuditStore {
  private readonly rows: AuditEvent[] = [];

  async head(ownerId: string): Promise<AuditEvent | null> {
    const owned = this.rows.filter((e) => e.ownerId === ownerId);
    return owned.length > 0 ? owned[owned.length - 1]! : null;
  }

  async append(event: AuditEvent): Promise<void> {
    this.rows.push(event);
  }

  async list(ownerId: string): Promise<AuditEvent[]> {
    return this.rows.filter((e) => e.ownerId === ownerId);
  }
}

export function createMemoryStores(): Stores {
  return {
    records: new MemoryRecordStore(),
    drafts: new MemoryDraftStore(),
    assessments: new MemoryAssessmentStore(),
    transcripts: new MemoryTranscriptStore(),
    audit: new MemoryAuditStore(),
  };
}
