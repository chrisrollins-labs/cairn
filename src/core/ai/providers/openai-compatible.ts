import type { AiTransport } from "../transport";
import type { AiCompletionRequest, AiCompletionResult } from "../types";

/**
 * The one place a real model endpoint is reached. Targets any service that
 * speaks the OpenAI `/chat/completions` contract (OpenAI, OpenRouter, a local
 * gateway) over `fetch` — no vendor SDK, so there is nothing to lock in.
 *
 * `fetch` is injected so this transport is unit-testable with a scripted
 * response and never hits the network in tests.
 */

export interface OpenAiCompatibleConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly fetchImpl?: typeof fetch;
  /** Provider label recorded on transcripts and provenance. */
  readonly provider?: string;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export function createOpenAiCompatibleTransport(config: OpenAiCompatibleConfig): AiTransport {
  const doFetch = config.fetchImpl ?? fetch;
  const provider = config.provider ?? "openai-compatible";

  return {
    async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
      if (!request.zeroDataRetention) {
        // The gateway always sets this true; a false slipping through means a
        // caller bypassed the gateway. Refuse rather than silently send data
        // to a retaining endpoint.
        throw new Error("openai-compatible transport requires zeroDataRetention=true");
      }

      const body = {
        model: request.model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        // Zero-data-retention signaling. `store: false` is OpenAI's opt-out;
        // `provider.zdr` is OpenRouter's "route only to ZDR endpoints" flag.
        // Endpoints that don't recognize a field ignore it.
        store: false,
        provider: { zdr: true },
      };

      const response = await doFetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`AI transport HTTP ${response.status}`);
      }

      const json = (await response.json()) as ChatCompletionResponse;
      const text = json.choices?.[0]?.message?.content;
      if (typeof text !== "string") {
        throw new Error("AI transport returned no completion text");
      }

      return {
        text,
        model: request.model,
        provider,
        usage: {
          promptTokens: json.usage?.prompt_tokens ?? 0,
          completionTokens: json.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}
