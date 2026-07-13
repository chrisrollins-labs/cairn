import { describe, expect, it } from "vitest";
import { computeContentHash } from "@/core/records/content";
import { ValidationError } from "@/shared/errors";
import { makeService, scriptedTransport, USER_A, USER_B } from "../helpers/factory";

const NOTE = "went for a long walk by the river and felt clear-headed afterwards";

describe("the review gate", () => {
  it("an AI proposal creates a pending draft and NO record", async () => {
    const { service } = makeService();
    const draft = await service.proposeAiDraft(USER_A, NOTE);

    expect(draft.status).toBe("pending");
    expect(draft.origin).toBe("ai");
    expect(draft.ai?.promptTemplateId).toBe("draft_entry");
    expect(draft.ai?.promptTemplateVersion).toBe(1);
    expect(await service.listRecords(USER_A)).toHaveLength(0);

    const log = await service.auditLog(USER_A);
    expect(log.map((e) => e.type)).toEqual(["draft.proposed"]);
  });

  it("only an explicit human approval commits a record, with full provenance", async () => {
    const { service } = makeService();
    const draft = await service.proposeAiDraft(USER_A, NOTE);
    const record = await service.approveDraft(USER_A, draft.id, USER_A);

    expect(record.source).toBe("ai_reviewed");
    expect(record.approvedBy).toBe(USER_A);
    expect(record.draftId).toBe(draft.id);
    expect(record.ai?.promptTemplateVersion).toBe(1);
    expect(record.contentHash).toBe(computeContentHash(record.title, record.body));

    const records = await service.listRecords(USER_A);
    expect(records).toHaveLength(1);

    const decided = await service.getDraft(USER_A, draft.id);
    expect(decided?.status).toBe("approved");
    expect(decided?.resultingRecordId).toBe(record.id);

    const log = await service.auditLog(USER_A);
    expect(log.map((e) => e.type)).toEqual(["draft.proposed", "record.committed"]);
    const commit = log[1]!;
    expect(commit.metadata.contentHash).toBe(record.contentHash);
    expect((await service.verifyAudit(USER_A)).ok).toBe(true);
  });

  it("a human edit is applied and audited before approval", async () => {
    const { service } = makeService();
    const draft = await service.proposeAiDraft(USER_A, NOTE);
    await service.editDraft(USER_A, draft.id, { title: "River walk", body: "Edited body." });
    const record = await service.approveDraft(USER_A, draft.id, USER_A);

    expect(record.title).toBe("River walk");
    expect(record.body).toBe("Edited body.");
    const log = await service.auditLog(USER_A);
    expect(log.map((e) => e.type)).toEqual(["draft.proposed", "draft.edited", "record.committed"]);
  });

  it("a rejected draft commits nothing", async () => {
    const { service } = makeService();
    const draft = await service.proposeAiDraft(USER_A, NOTE);
    await service.rejectDraft(USER_A, draft.id);

    expect(await service.listRecords(USER_A)).toHaveLength(0);
    expect((await service.getDraft(USER_A, draft.id))?.status).toBe("rejected");
    const log = await service.auditLog(USER_A);
    expect(log.map((e) => e.type)).toEqual(["draft.proposed", "draft.rejected"]);
  });

  it("a decided draft cannot be approved or rejected again", async () => {
    const { service } = makeService();
    const draft = await service.proposeAiDraft(USER_A, NOTE);
    await service.approveDraft(USER_A, draft.id, USER_A);
    await expect(service.approveDraft(USER_A, draft.id, USER_A)).rejects.toThrow(/already/);
    await expect(service.rejectDraft(USER_A, draft.id)).rejects.toThrow(/already/);
  });
});

describe("AI never reaches the record store", () => {
  it("proposal and assessment leave the record count untouched", async () => {
    const { service } = makeService();

    // One human record exists to assess.
    const record = await service.createHumanEntry(USER_A, { title: "Seed", body: "Body." });
    expect(await service.listRecords(USER_A)).toHaveLength(1);

    // AI paths run repeatedly...
    await service.proposeAiDraft(USER_A, NOTE);
    await service.assessRecord(USER_A, record.id);
    await service.assessRecord(USER_A, record.id);

    // ...and the record count is still exactly one.
    expect(await service.listRecords(USER_A)).toHaveLength(1);
  });
});

describe("assessments are separate, versioned, labeled artifacts", () => {
  it("each assessment is AI-labeled and never merged into the record", async () => {
    const { service } = makeService();
    const record = await service.createHumanEntry(USER_A, { title: "Seed", body: "The record body." });
    const a1 = await service.assessRecord(USER_A, record.id);

    expect(a1.label).toBe("ai_generated");
    expect(a1.active).toBe(true);
    expect(a1.version).toBe(1);
    // The record's own body is unchanged by assessment.
    expect((await service.getRecord(USER_A, record.id))?.body).toBe("The record body.");
  });

  it("a new assessment supersedes the prior active one", async () => {
    const { service } = makeService();
    const record = await service.createHumanEntry(USER_A, { title: "Seed", body: "Body." });
    await service.assessRecord(USER_A, record.id);
    const a2 = await service.assessRecord(USER_A, record.id);

    expect(a2.version).toBe(2);
    const all = await service.listAssessments(USER_A, record.id);
    const active = all.filter((a) => a.active);
    expect(active).toHaveLength(1);
    expect(active[0]!.id).toBe(a2.id);
  });
});

describe("structured-output retry", () => {
  it("recovers when the first reply is not valid JSON", async () => {
    const transport = scriptedTransport(["not json at all", '{"title":"Recovered","body":"OK"}']);
    const { service } = makeService({ transport });
    const draft = await service.proposeAiDraft(USER_A, NOTE);
    expect(draft.title).toBe("Recovered");
  });

  it("gives up with a validation error after one failed retry", async () => {
    const transport = scriptedTransport(["nope", "still nope"]);
    const { service } = makeService({ transport });
    await expect(service.proposeAiDraft(USER_A, NOTE)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("per-user isolation", () => {
  it("keeps records and audit chains strictly per-tenant", async () => {
    const { service } = makeService();

    const da = await service.proposeAiDraft(USER_A, "note from A");
    await service.approveDraft(USER_A, da.id, USER_A);
    const db = await service.proposeAiDraft(USER_B, "note from B");
    await service.approveDraft(USER_B, db.id, USER_B);

    const aRecords = await service.listRecords(USER_A);
    const bRecords = await service.listRecords(USER_B);
    expect(aRecords).toHaveLength(1);
    expect(bRecords).toHaveLength(1);
    expect(aRecords[0]!.id).not.toBe(bRecords[0]!.id);

    // B cannot see A's draft.
    expect(await service.getDraft(USER_B, da.id)).toBeNull();

    // Chains are independent and both verify.
    expect((await service.verifyAudit(USER_A)).ok).toBe(true);
    expect((await service.verifyAudit(USER_B)).ok).toBe(true);
    expect((await service.auditLog(USER_A)).every((e) => e.ownerId === USER_A)).toBe(true);
  });
});
