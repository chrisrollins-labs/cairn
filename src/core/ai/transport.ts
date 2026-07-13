import type { AiCompletionRequest, AiCompletionResult } from "./types";

/**
 * The model transport seam. The gateway depends on this interface, never on a
 * concrete provider or on `fetch`. Production wires the OpenAI-compatible
 * transport; tests and the zero-infrastructure default wire the deterministic
 * mock. This is why the entire suite runs offline (ADR-009).
 */
export interface AiTransport {
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
}
