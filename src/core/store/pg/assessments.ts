import type { QueryExecutor } from "@/core/db/executor";
import type { AiOrigin, Assessment } from "@/core/records/types";
import type { AssessmentStore } from "../interfaces";

interface AssessmentRow {
  id: string;
  owner_id: string;
  record_id: string;
  version: number;
  active: boolean;
  body: string;
  ai: AiOrigin;
  label: "ai_generated";
  created_at: string;
}

const COLUMNS = "id, owner_id, record_id, version, active, body, ai, label, created_at";

function mapRow(r: AssessmentRow): Assessment {
  return {
    id: r.id,
    ownerId: r.owner_id,
    recordId: r.record_id,
    version: r.version,
    active: r.active,
    body: r.body,
    ai: r.ai,
    label: r.label,
    createdAt: Number(r.created_at),
  };
}

export class PgAssessmentStore implements AssessmentStore {
  constructor(private readonly db: QueryExecutor) {}

  async insert(a: Assessment): Promise<void> {
    await this.db.query(
      `insert into public.assessments (${COLUMNS})
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [a.id, a.ownerId, a.recordId, a.version, a.active, a.body, a.ai, a.label, a.createdAt],
    );
  }

  async deactivateActiveFor(ownerId: string, recordId: string): Promise<void> {
    await this.db.query(
      `update public.assessments set active = false
       where owner_id = $1 and record_id = $2 and active = true`,
      [ownerId, recordId],
    );
  }

  async listByRecord(ownerId: string, recordId: string): Promise<Assessment[]> {
    const { rows } = await this.db.query<AssessmentRow>(
      `select ${COLUMNS} from public.assessments
       where owner_id = $1 and record_id = $2 order by version desc`,
      [ownerId, recordId],
    );
    return rows.map(mapRow);
  }
}
