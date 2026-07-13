import { AiGateway } from "@/core/ai/gateway";
import { extractJsonObject } from "@/core/ai/json";
import { scopePriorReflections, type ScopeOptions } from "@/core/ai/scoping";
import type { ChainVerification } from "@/core/audit/chain";
import type { AuditEvent } from "@/core/audit/event";
import type { AuditLog } from "@/core/audit/log";
import {
  buildAssessEntryMessages,
  buildDraftEntryMessages,
  TEMPLATES,
} from "@/core/prompts/templates";
import type { Stores } from "@/core/store/interfaces";
import type { AiMessage } from "@/core/ai/types";
import type { Clock, IdGen } from "@/shared/clock";
import { InvalidStateError, NotFoundError, ValidationError } from "@/shared/errors";
import { computeContentHash } from "./content";
import { DraftContentSchema, EntryContentSchema, NoteSchema, type EntryContent } from "./schema";
import type { AiOrigin, Assessment, Draft, RecordEntry } from "./types";

export interface RecordsServiceDeps {
  readonly stores: Stores;
  readonly gateway: AiGateway;
  readonly auditLog: AuditLog;
  readonly clock: Clock;
  readonly newId: IdGen;
}

/**
 * The record domain, and the one place the review gate lives (ADR-001).
 *
 * The invariant that makes the whole thing trustworthy is small and mechanical:
 * `commitRecord` is the ONLY method that writes to the record store, it is
 * private, and neither AI path can call it. `proposeAiDraft` writes a draft;
 * `assessRecord` writes a labeled artifact; only a person calling `approveDraft`
 * (or authoring directly) reaches `commitRecord`. Every state change appends to
 * the tamper-evident audit chain.
 */
export class RecordsService {
  constructor(private readonly deps: RecordsServiceDeps) {}

  // --- AI proposal path (writes drafts + transcripts + audit; never records) ---

  async proposeAiDraft(ownerId: string, note: string): Promise<Draft> {
    const cleanNote = NoteSchema.parse(note);
    const { content, origin } = await this.draftContentFromNote(ownerId, cleanNote);

    const draft: Draft = {
      id: this.deps.newId(),
      ownerId,
      origin: "ai",
      status: "pending",
      title: content.title,
      body: content.body,
      ai: origin,
      sourceNote: cleanNote,
      createdAt: this.deps.clock(),
      decidedAt: null,
      resultingRecordId: null,
    };

    await this.deps.stores.drafts.insert(draft);
    await this.deps.auditLog.append({
      ownerId,
      type: "draft.proposed",
      subjectId: draft.id,
      metadata: {
        origin: "ai",
        transcriptId: origin.transcriptId,
        model: origin.model,
        promptTemplateId: origin.promptTemplateId,
        promptTemplateVersion: origin.promptTemplateVersion,
        promptTokens: origin.promptTokens,
        completionTokens: origin.completionTokens,
      },
    });

    return draft;
  }

  /** Call the model for a structured draft, with one corrective retry. */
  private async draftContentFromNote(
    ownerId: string,
    note: string,
  ): Promise<{ content: EntryContent; origin: AiOrigin }> {
    const template = TEMPLATES.draft_entry;
    let messages: AiMessage[] = buildDraftEntryMessages(note);

    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await this.deps.gateway.run({
        ownerId,
        flow: "draft_entry",
        templateId: template.id,
        templateVersion: template.version,
        messages,
      });

      const parsed = DraftContentSchema.safeParse(safeExtract(result.text));
      if (parsed.success) {
        return { content: parsed.data, origin: result.origin };
      }

      // Feed the failed reply back with a correction and try once more.
      messages = [
        ...messages,
        { role: "assistant", content: result.text },
        {
          role: "user",
          content:
            'That was not a valid JSON object with string "title" and "body". ' +
            "Respond with only that JSON object.",
        },
      ];
    }

    throw new ValidationError("AI draft did not match the required schema after one retry");
  }

  // --- Human decision path (the gate) ---

  async editDraft(ownerId: string, draftId: string, content: EntryContent): Promise<Draft> {
    const draft = await this.requirePendingDraft(ownerId, draftId);
    const clean = EntryContentSchema.parse(content);

    const updated: Draft = { ...draft, title: clean.title, body: clean.body };
    await this.deps.stores.drafts.update(updated);
    await this.deps.auditLog.append({
      ownerId,
      type: "draft.edited",
      subjectId: draft.id,
      metadata: { editedFields: ["title", "body"] },
    });
    return updated;
  }

  async rejectDraft(ownerId: string, draftId: string): Promise<Draft> {
    const draft = await this.requirePendingDraft(ownerId, draftId);
    const updated: Draft = { ...draft, status: "rejected", decidedAt: this.deps.clock() };
    await this.deps.stores.drafts.update(updated);
    await this.deps.auditLog.append({
      ownerId,
      type: "draft.rejected",
      subjectId: draft.id,
      metadata: { origin: draft.origin },
    });
    return updated;
  }

  /**
   * The gate. A person approves a pending draft; only here does a record come
   * into existence from AI-assisted content. The draft's content (with any human
   * edits already applied via editDraft) is what gets committed.
   */
  async approveDraft(ownerId: string, draftId: string, reviewerId: string): Promise<RecordEntry> {
    const draft = await this.requirePendingDraft(ownerId, draftId);

    const record = await this.commitRecord({
      ownerId,
      title: draft.title,
      body: draft.body,
      source: draft.origin === "ai" ? "ai_reviewed" : "human",
      ai: draft.ai,
      draftId: draft.id,
      approvedBy: reviewerId,
    });

    await this.deps.stores.drafts.update({
      ...draft,
      status: "approved",
      decidedAt: this.deps.clock(),
      resultingRecordId: record.id,
    });

    return record;
  }

  /** A person authoring their own entry directly — no proposal, no gate needed. */
  async createHumanEntry(ownerId: string, content: EntryContent): Promise<RecordEntry> {
    const clean = EntryContentSchema.parse(content);
    return this.commitRecord({
      ownerId,
      title: clean.title,
      body: clean.body,
      source: "human",
      ai: null,
      draftId: null,
      approvedBy: ownerId,
    });
  }

  /**
   * The SOLE writer to the record store. Private on purpose: there is exactly
   * one door into `records`, and an AI code path cannot open it. Every commit
   * stamps a content hash and appends `record.committed` to the audit chain.
   */
  private async commitRecord(input: {
    ownerId: string;
    title: string;
    body: string;
    source: RecordEntry["source"];
    ai: AiOrigin | null;
    draftId: string | null;
    approvedBy: string;
  }): Promise<RecordEntry> {
    const contentHash = computeContentHash(input.title, input.body);
    const record: RecordEntry = {
      id: this.deps.newId(),
      ownerId: input.ownerId,
      title: input.title,
      body: input.body,
      source: input.source,
      contentHash,
      ai: input.ai,
      draftId: input.draftId,
      approvedBy: input.approvedBy,
      createdAt: this.deps.clock(),
    };

    await this.deps.stores.records.insert(record);
    await this.deps.auditLog.append({
      ownerId: input.ownerId,
      type: "record.committed",
      subjectId: record.id,
      metadata: {
        source: record.source,
        contentHash,
        draftId: record.draftId ?? null,
        approvedBy: record.approvedBy,
        promptTemplateId: input.ai?.promptTemplateId ?? null,
        promptTemplateVersion: input.ai?.promptTemplateVersion ?? null,
        transcriptId: input.ai?.transcriptId ?? null,
      },
    });

    return record;
  }

  // --- AI assessment path (writes assessments + transcripts + audit; never records) ---

  async assessRecord(
    ownerId: string,
    recordId: string,
    scope?: Partial<ScopeOptions>,
  ): Promise<Assessment> {
    const record = await this.deps.stores.records.get(ownerId, recordId);
    if (!record) throw new NotFoundError(`record ${recordId} not found`);

    const prior = await this.deps.stores.assessments.listByRecord(ownerId, recordId);
    const priorReflections = scopePriorReflections(
      prior.map((a) => a.body),
      { ...defaultScope(scope) },
    );

    const template = TEMPLATES.assess_entry;
    const result = await this.deps.gateway.run({
      ownerId,
      flow: "assess_entry",
      templateId: template.id,
      templateVersion: template.version,
      messages: buildAssessEntryMessages({
        title: record.title,
        body: record.body,
        priorReflections,
      }),
    });

    await this.deps.stores.assessments.deactivateActiveFor(ownerId, recordId);
    const assessment: Assessment = {
      id: this.deps.newId(),
      ownerId,
      recordId,
      version: prior.length + 1,
      active: true,
      body: result.text.trim(),
      ai: result.origin,
      label: "ai_generated",
      createdAt: this.deps.clock(),
    };

    await this.deps.stores.assessments.insert(assessment);
    await this.deps.auditLog.append({
      ownerId,
      type: "assessment.generated",
      subjectId: assessment.id,
      metadata: {
        recordId,
        version: assessment.version,
        transcriptId: result.origin.transcriptId,
        model: result.origin.model,
        promptTemplateId: result.origin.promptTemplateId,
        promptTemplateVersion: result.origin.promptTemplateVersion,
        includedPriorCount: priorReflections.length,
      },
    });

    return assessment;
  }

  // --- Queries ---

  async listRecords(ownerId: string): Promise<RecordEntry[]> {
    return this.deps.stores.records.listByOwner(ownerId);
  }

  async getRecord(ownerId: string, id: string): Promise<RecordEntry | null> {
    return this.deps.stores.records.get(ownerId, id);
  }

  async listPendingDrafts(ownerId: string): Promise<Draft[]> {
    return this.deps.stores.drafts.listByOwner(ownerId, "pending");
  }

  async getDraft(ownerId: string, id: string): Promise<Draft | null> {
    return this.deps.stores.drafts.get(ownerId, id);
  }

  async listAssessments(ownerId: string, recordId: string): Promise<Assessment[]> {
    return this.deps.stores.assessments.listByRecord(ownerId, recordId);
  }

  async auditLog(ownerId: string): Promise<AuditEvent[]> {
    return this.deps.auditLog.list(ownerId);
  }

  async verifyAudit(ownerId: string): Promise<ChainVerification> {
    return this.deps.auditLog.verify(ownerId);
  }

  // --- Internals ---

  private async requirePendingDraft(ownerId: string, draftId: string): Promise<Draft> {
    const draft = await this.deps.stores.drafts.get(ownerId, draftId);
    if (!draft) throw new NotFoundError(`draft ${draftId} not found`);
    if (draft.status !== "pending") {
      throw new InvalidStateError(`draft ${draftId} is already ${draft.status}`);
    }
    return draft;
  }
}

function safeExtract(text: string): unknown {
  try {
    return extractJsonObject(text);
  } catch {
    return undefined;
  }
}

function defaultScope(scope?: Partial<ScopeOptions>): ScopeOptions {
  return {
    includePriorContext: scope?.includePriorContext ?? false,
    maxItems: scope?.maxItems ?? 5,
    maxChars: scope?.maxChars ?? 2_000,
  };
}
