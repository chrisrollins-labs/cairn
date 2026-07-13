import type { Clock, IdGen } from "@/shared/clock";
import type { AiOrigin } from "@/core/records/types";
import type { TranscriptStore } from "./transcript";
import type { AiTransport } from "./transport";
import type { AiFlow, AiMessage } from "./types";

/**
 * The AI gateway (ADR-004): the one and only path from this app to a model.
 *
 * It enforces the guarantees that make model use safe here - an allow-list of
 * flows, a per-flow model, zero-data-retention on every call, and a transcript
 * written for every call - in one place, so no feature can accidentally reach a
 * model on its own terms. Crucially, the gateway can write a transcript but has
 * no access to the record store: its output is always a proposal or a labeled
 * artifact, never a committed record (ADR-001).
 */

export interface GatewayModelConfig {
  readonly default: string;
  readonly perFlow?: Partial<Record<AiFlow, string>>;
}

export interface AiGatewayDeps {
  readonly transport: AiTransport;
  readonly transcripts: TranscriptStore;
  readonly clock: Clock;
  readonly newId: IdGen;
  readonly models: GatewayModelConfig;
}

export interface GatewayCall {
  readonly ownerId: string;
  readonly flow: AiFlow;
  readonly templateId: string;
  readonly templateVersion: number;
  readonly messages: readonly AiMessage[];
}

export interface GatewayResult {
  readonly text: string;
  readonly origin: AiOrigin;
}

const ALLOWED_FLOWS: ReadonlySet<AiFlow> = new Set<AiFlow>(["draft_entry", "assess_entry"]);

export class AiGateway {
  constructor(private readonly deps: AiGatewayDeps) {}

  async run(call: GatewayCall): Promise<GatewayResult> {
    if (!ALLOWED_FLOWS.has(call.flow)) {
      throw new Error(`AI flow not allow-listed: ${call.flow}`);
    }

    const model = this.deps.models.perFlow?.[call.flow] ?? this.deps.models.default;

    const result = await this.deps.transport.complete({
      model,
      messages: call.messages,
      zeroDataRetention: true,
    });

    const transcriptId = this.deps.newId();
    await this.deps.transcripts.insert({
      id: transcriptId,
      ownerId: call.ownerId,
      flow: call.flow,
      model: result.model,
      provider: result.provider,
      promptTemplateId: call.templateId,
      promptTemplateVersion: call.templateVersion,
      messages: call.messages,
      response: result.text,
      usage: result.usage,
      zeroDataRetention: true,
      createdAt: this.deps.clock(),
    });

    return {
      text: result.text,
      origin: {
        model: result.model,
        provider: result.provider,
        promptTemplateId: call.templateId,
        promptTemplateVersion: call.templateVersion,
        transcriptId,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
      },
    };
  }
}
