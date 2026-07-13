/**
 * The AI vocabulary shared by the transport, the providers, and the gateway.
 *
 * There is exactly one shape of "call a model" in this codebase, and it goes
 * through the gateway (ADR-004). Nothing else in the app knows a provider's
 * wire format.
 */

/** The allow-listed flows. A model call that names no flow is refused. */
export type AiFlow = "draft_entry" | "assess_entry";

export type AiRole = "system" | "user" | "assistant";

export interface AiMessage {
  readonly role: AiRole;
  readonly content: string;
}

export interface AiUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
}

export interface AiCompletionRequest {
  readonly model: string;
  readonly messages: readonly AiMessage[];
  /**
   * When true, the transport must only reach an endpoint that contractually
   * does not retain prompt or completion data. The gateway sets this on every
   * call; a transport that cannot honor it must throw rather than proceed.
   */
  readonly zeroDataRetention: boolean;
}

export interface AiCompletionResult {
  readonly text: string;
  readonly model: string;
  readonly provider: string;
  readonly usage: AiUsage;
}
