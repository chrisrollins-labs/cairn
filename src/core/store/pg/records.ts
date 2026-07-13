import type { QueryExecutor } from "@/core/db/executor";
import type { AiOrigin, RecordEntry, RecordSource } from "@/core/records/types";
import type { RecordStore } from "../interfaces";

interface RecordRow {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  source: RecordSource;
  content_hash: string;
  ai: AiOrigin | null;
  draft_id: string | null;
  approved_by: string;
  created_at: string;
}

const COLUMNS =
  "id, owner_id, title, body, source, content_hash, ai, draft_id, approved_by, created_at";

function mapRow(r: RecordRow): RecordEntry {
  return {
    id: r.id,
    ownerId: r.owner_id,
    title: r.title,
    body: r.body,
    source: r.source,
    contentHash: r.content_hash,
    ai: r.ai,
    draftId: r.draft_id,
    approvedBy: r.approved_by,
    createdAt: Number(r.created_at),
  };
}

export class PgRecordStore implements RecordStore {
  constructor(private readonly db: QueryExecutor) {}

  async insert(record: RecordEntry): Promise<void> {
    await this.db.query(
      `insert into public.records (${COLUMNS})
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        record.id,
        record.ownerId,
        record.title,
        record.body,
        record.source,
        record.contentHash,
        record.ai,
        record.draftId,
        record.approvedBy,
        record.createdAt,
      ],
    );
  }

  async get(ownerId: string, id: string): Promise<RecordEntry | null> {
    const { rows } = await this.db.query<RecordRow>(
      `select ${COLUMNS} from public.records where owner_id = $1 and id = $2`,
      [ownerId, id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async listByOwner(ownerId: string): Promise<RecordEntry[]> {
    const { rows } = await this.db.query<RecordRow>(
      `select ${COLUMNS} from public.records where owner_id = $1 order by created_at desc`,
      [ownerId],
    );
    return rows.map(mapRow);
  }
}
