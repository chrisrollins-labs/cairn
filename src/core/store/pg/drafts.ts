import type { QueryExecutor } from "@/core/db/executor";
import type { AiOrigin, Draft, DraftOrigin, DraftStatus } from "@/core/records/types";
import type { DraftStore } from "../interfaces";

interface DraftRow {
  id: string;
  owner_id: string;
  origin: DraftOrigin;
  status: DraftStatus;
  title: string;
  body: string;
  ai: AiOrigin | null;
  source_note: string;
  created_at: string;
  decided_at: string | null;
  resulting_record_id: string | null;
}

const COLUMNS =
  "id, owner_id, origin, status, title, body, ai, source_note, created_at, decided_at, resulting_record_id";

function mapRow(r: DraftRow): Draft {
  return {
    id: r.id,
    ownerId: r.owner_id,
    origin: r.origin,
    status: r.status,
    title: r.title,
    body: r.body,
    ai: r.ai,
    sourceNote: r.source_note,
    createdAt: Number(r.created_at),
    decidedAt: r.decided_at === null ? null : Number(r.decided_at),
    resultingRecordId: r.resulting_record_id,
  };
}

export class PgDraftStore implements DraftStore {
  constructor(private readonly db: QueryExecutor) {}

  async insert(draft: Draft): Promise<void> {
    await this.db.query(
      `insert into public.drafts (${COLUMNS})
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        draft.id,
        draft.ownerId,
        draft.origin,
        draft.status,
        draft.title,
        draft.body,
        draft.ai,
        draft.sourceNote,
        draft.createdAt,
        draft.decidedAt,
        draft.resultingRecordId,
      ],
    );
  }

  async get(ownerId: string, id: string): Promise<Draft | null> {
    const { rows } = await this.db.query<DraftRow>(
      `select ${COLUMNS} from public.drafts where owner_id = $1 and id = $2`,
      [ownerId, id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async update(draft: Draft): Promise<void> {
    await this.db.query(
      `update public.drafts
       set status = $3, title = $4, body = $5, decided_at = $6, resulting_record_id = $7
       where owner_id = $1 and id = $2`,
      [
        draft.ownerId,
        draft.id,
        draft.status,
        draft.title,
        draft.body,
        draft.decidedAt,
        draft.resultingRecordId,
      ],
    );
  }

  async listByOwner(ownerId: string, status?: DraftStatus): Promise<Draft[]> {
    if (status === undefined) {
      const { rows } = await this.db.query<DraftRow>(
        `select ${COLUMNS} from public.drafts where owner_id = $1 order by created_at desc`,
        [ownerId],
      );
      return rows.map(mapRow);
    }
    const { rows } = await this.db.query<DraftRow>(
      `select ${COLUMNS} from public.drafts
       where owner_id = $1 and status = $2 order by created_at desc`,
      [ownerId, status],
    );
    return rows.map(mapRow);
  }
}
