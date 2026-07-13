import type { AiFlow, AiMessage, AiUsage } from "./types";

/**
 * A record of one model call. Transcripts hold the prompt and completion so a
 * decision can be reviewed later; they are per-user and RLS-scoped like
 * everything else. They are distinct from the audit log on purpose: the audit
 * log is metadata-only and tamper-evident (ADR-003), whereas a transcript
 * necessarily contains the prompt text (the person's own note). The audit event
 * references a transcript by id; it never copies its content.
 */
export interface Transcript {
  readonly id: string;
  readonly ownerId: string;
  readonly flow: AiFlow;
  readonly model: string;
  readonly provider: string;
  readonly promptTemplateId: string;
  readonly promptTemplateVersion: number;
  readonly messages: readonly AiMessage[];
  readonly response: string;
  readonly usage: AiUsage;
  readonly zeroDataRetention: boolean;
  readonly createdAt: number;
}

export interface TranscriptStore {
  insert(transcript: Transcript): Promise<void>;
  get(ownerId: string, id: string): Promise<Transcript | null>;
}
