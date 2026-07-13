import { describe, expect, it } from "vitest";
import { makeService, USER_A, USER_B } from "../helpers/factory";

/**
 * An end-to-end journey through the exact service calls the Server Actions make
 * (app/../server/actions.ts), driven as a story rather than isolated units. If
 * this passes, the review-and-approve flow works from note to committed record
 * to verified audit chain.
 */
describe("full review-and-approve journey", () => {
  it("note → draft → edit → approve → assess → verify, isolated per user", async () => {
    const { service } = makeService();

    // 1. Avery writes a note; the assistant proposes a draft. Still no record.
    const draft = await service.proposeAiDraft(USER_A, "finished the trail map revisions today");
    expect(await service.listRecords(USER_A)).toHaveLength(0);
    expect(draft.status).toBe("pending");

    // 2. Avery tweaks the draft, then approves it.
    await service.editDraft(USER_A, draft.id, {
      title: "Trail map revisions",
      body: "Finished the trail map revisions today.",
    });
    const record = await service.approveDraft(USER_A, draft.id, USER_A);
    expect(record.source).toBe("ai_reviewed");
    expect(record.title).toBe("Trail map revisions");
    expect(await service.listRecords(USER_A)).toHaveLength(1);

    // 3. Avery asks for an assessment - a separate, labeled artifact.
    const assessment = await service.assessRecord(USER_A, record.id);
    expect(assessment.label).toBe("ai_generated");
    expect(await service.listRecords(USER_A)).toHaveLength(1); // unchanged

    // 4. The audit chain tells the whole story, in order, and verifies.
    const log = await service.auditLog(USER_A);
    expect(log.map((e) => e.type)).toEqual([
      "draft.proposed",
      "draft.edited",
      "record.committed",
      "assessment.generated",
    ]);
    const verification = await service.verifyAudit(USER_A);
    expect(verification.ok).toBe(true);
    expect(verification.length).toBe(4);

    // 5. Blair, a different tenant, sees none of it and has an empty, valid chain.
    expect(await service.listRecords(USER_B)).toHaveLength(0);
    expect(await service.auditLog(USER_B)).toHaveLength(0);
    expect((await service.verifyAudit(USER_B)).ok).toBe(true);
  });

  it("a rejected proposal leaves the record store and audit chain honest", async () => {
    const { service } = makeService();
    const draft = await service.proposeAiDraft(USER_A, "a passing thought, not worth keeping");
    await service.rejectDraft(USER_A, draft.id);

    expect(await service.listRecords(USER_A)).toHaveLength(0);
    const log = await service.auditLog(USER_A);
    expect(log.map((e) => e.type)).toEqual(["draft.proposed", "draft.rejected"]);
    expect((await service.verifyAudit(USER_A)).ok).toBe(true);
  });
});
