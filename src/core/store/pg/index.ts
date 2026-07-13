import type { QueryExecutor } from "@/core/db/executor";
import type { Stores } from "../interfaces";
import { PgAssessmentStore } from "./assessments";
import { PgDraftStore } from "./drafts";
import { PgRecordStore } from "./records";
import { PgTranscriptStore } from "./transcripts";

export { PgAuditLog } from "./audit-log";

/**
 * Build the record-domain stores over a tenant-scoped executor. Pair with
 * PgAuditLog for the audit log; both must run on the same GUC-scoped connection
 * (see pg-executor withTenant) so RLS isolates every query to one tenant.
 */
export function createPgStores(db: QueryExecutor): Stores {
  return {
    records: new PgRecordStore(db),
    drafts: new PgDraftStore(db),
    assessments: new PgAssessmentStore(db),
    transcripts: new PgTranscriptStore(db),
  };
}
