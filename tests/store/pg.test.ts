import { describe, expect, it } from "vitest";
import { PgAuditLog } from "@/core/store/pg";
import { PgRecordStore } from "@/core/store/pg/records";
import { PgDraftStore } from "@/core/store/pg/drafts";
import type { RecordEntry } from "@/core/records/types";
import { ScriptedExecutor } from "../helpers/scripted-db";

const SAMPLE_RECORD: RecordEntry = {
  id: "r1",
  ownerId: "u1",
  title: "Title",
  body: "Body",
  source: "ai_reviewed",
  contentHash: "abc",
  ai: null,
  draftId: "d1",
  approvedBy: "u1",
  createdAt: 1700000000000,
};

describe("PgRecordStore", () => {
  it("inserts all columns with matching params", async () => {
    const db = new ScriptedExecutor([[]]);
    await new PgRecordStore(db).insert(SAMPLE_RECORD);
    expect(db.sqlAt(0)).toMatch(/^insert into public\.records \(id, owner_id, title/);
    expect(db.calls[0]!.params).toEqual([
      "r1", "u1", "Title", "Body", "ai_reviewed", "abc", null, "d1", "u1", 1700000000000,
    ]);
  });

  it("scopes get by owner and maps the row", async () => {
    const db = new ScriptedExecutor([
      [{
        id: "r1", owner_id: "u1", title: "T", body: "B", source: "human",
        content_hash: "h", ai: null, draft_id: null, approved_by: "u1",
        created_at: "1700000000000",
      }],
    ]);
    const record = await new PgRecordStore(db).get("u1", "r1");
    expect(db.sqlAt(0)).toContain("where owner_id = $1 and id = $2");
    expect(record?.createdAt).toBe(1700000000000);
    expect(record?.source).toBe("human");
  });
});

describe("PgDraftStore", () => {
  it("updates only the mutable columns, scoped by owner and id", async () => {
    const db = new ScriptedExecutor([[]]);
    await new PgDraftStore(db).update({
      id: "d1", ownerId: "u1", origin: "ai", status: "approved", title: "T", body: "B",
      ai: null, sourceNote: "n", createdAt: 1, decidedAt: 2, resultingRecordId: "r1",
    });
    expect(db.sqlAt(0)).toContain("update public.drafts");
    expect(db.sqlAt(0)).toContain("where owner_id = $1 and id = $2");
    expect(db.calls[0]!.params).toEqual(["u1", "d1", "approved", "T", "B", 2, "r1"]);
  });
});

describe("PgAuditLog", () => {
  it("supplies only semantic fields and returns the sealed row", async () => {
    const db = new ScriptedExecutor([
      [{
        owner_id: "u1", seq: "1", at_ms: "1700000000000", event_type: "record.committed",
        subject_id: "r1", metadata: { source: "human" },
        prev_hash: "0".repeat(64), hash: "f".repeat(64),
      }],
    ]);
    const clock = () => 1700000000000;
    const event = await new PgAuditLog(db, clock).append({
      ownerId: "u1", type: "record.committed", subjectId: "r1", metadata: { source: "human" },
    });

    // The app never sends seq / prev_hash / hash — the trigger seals those.
    const sql = db.sqlAt(0);
    expect(sql).toContain("insert into public.audit_events (owner_id, at_ms, event_type, subject_id, metadata)");
    expect(sql).not.toContain("prev_hash)");
    expect(db.calls[0]!.params).toEqual(["u1", 1700000000000, "record.committed", "r1", { source: "human" }]);
    expect(event.seq).toBe(1);
    expect(event.hash).toBe("f".repeat(64));
  });

  it("verifies via the SQL function and maps a broken result", async () => {
    const db = new ScriptedExecutor([
      [{ ok: false, length: 3, head_hash: null, broken_at: "2", reason: "row was altered" }],
    ]);
    const result = await new PgAuditLog(db, () => 0).verify("u1");
    expect(db.sqlAt(0)).toContain("from verify_audit_chain()");
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(2);
    expect(result.reason).toBe("row was altered");
  });
});
