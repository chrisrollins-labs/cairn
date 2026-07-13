import type { AppendInput, ChainVerification } from "@/core/audit/chain";
import type { AuditEvent, AuditEventType, AuditMetadata } from "@/core/audit/event";
import type { AuditLog } from "@/core/audit/log";
import type { QueryExecutor } from "@/core/db/executor";
import type { Clock } from "@/shared/clock";

/**
 * The Postgres audit log. Unlike the TypeScript chain, this implementation does
 * NOT compute the chain fields - the database trigger does (db/migrations,
 * 0006). The app supplies only the semantic fields; the trigger assigns seq,
 * prev_hash, and hash and returns the sealed row. Verification calls the SQL
 * function, which recomputes the chain with the same hash function the trigger
 * used. That is the whole point of doing it in the database: the seal does not
 * depend on the application behaving. (ADR-002)
 *
 * The connection this runs on is tenant-scoped via the app.user_id GUC
 * (see pg-executor withTenant), so RLS and verify_audit_chain() both act on the
 * current tenant.
 */

interface AuditRow {
  owner_id: string;
  seq: string;
  at_ms: string;
  event_type: AuditEventType;
  subject_id: string;
  metadata: AuditMetadata;
  prev_hash: string;
  hash: string;
}

const COLUMNS = "owner_id, seq, at_ms, event_type, subject_id, metadata, prev_hash, hash";

function mapRow(r: AuditRow): AuditEvent {
  return {
    ownerId: r.owner_id,
    seq: Number(r.seq),
    at: Number(r.at_ms),
    type: r.event_type,
    subjectId: r.subject_id,
    metadata: r.metadata,
    prevHash: r.prev_hash,
    hash: r.hash,
  };
}

interface VerifyRow {
  ok: boolean;
  length: number;
  head_hash: string | null;
  broken_at: string | null;
  reason: string | null;
}

export class PgAuditLog implements AuditLog {
  constructor(
    private readonly db: QueryExecutor,
    private readonly clock: Clock,
  ) {}

  async append(input: AppendInput): Promise<AuditEvent> {
    const { rows } = await this.db.query<AuditRow>(
      `insert into public.audit_events (owner_id, at_ms, event_type, subject_id, metadata)
       values ($1, $2, $3, $4, $5)
       returning ${COLUMNS}`,
      [input.ownerId, this.clock(), input.type, input.subjectId, input.metadata],
    );
    const row = rows[0];
    if (!row) throw new Error("audit_events insert returned no row");
    return mapRow(row);
  }

  async list(ownerId: string): Promise<AuditEvent[]> {
    const { rows } = await this.db.query<AuditRow>(
      `select ${COLUMNS} from public.audit_events where owner_id = $1 order by seq asc`,
      [ownerId],
    );
    return rows.map(mapRow);
  }

  async verify(ownerId: string): Promise<ChainVerification> {
    // verify_audit_chain() reads app_current_user_id(); it acts on whichever
    // tenant this connection is scoped to. ownerId is that same tenant.
    void ownerId;
    const { rows } = await this.db.query<VerifyRow>(
      `select ok, length, head_hash, broken_at, reason from verify_audit_chain()`,
    );
    const row = rows[0];
    if (!row) throw new Error("verify_audit_chain() returned no row");
    return {
      ok: row.ok,
      length: row.length,
      headHash: row.head_hash,
      ...(row.broken_at !== null ? { brokenAt: Number(row.broken_at) } : {}),
      ...(row.reason !== null ? { reason: row.reason } : {}),
    };
  }
}
