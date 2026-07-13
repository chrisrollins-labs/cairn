import { createMockTransport } from "@/core/ai/providers/mock";
import { createOpenAiCompatibleTransport } from "@/core/ai/providers/openai-compatible";
import type { AiTransport } from "@/core/ai/transport";
import type { GatewayModelConfig } from "@/core/ai/gateway";

/**
 * Reads the runtime configuration from the environment once. The app runs with
 * zero configuration: if no real AI key is present it uses the deterministic
 * mock transport, and if CAIRN_STORE is not "postgres" it uses the in-memory
 * backend (ADR-009). Nothing here ever throws for missing optional config.
 */

export type StoreKind = "memory" | "postgres";

export interface RuntimeConfig {
  readonly store: StoreKind;
  readonly transport: AiTransport;
  readonly models: GatewayModelConfig;
  readonly usingRealModel: boolean;
}

let cached: RuntimeConfig | null = null;

export function runtimeConfig(): RuntimeConfig {
  if (cached) return cached;

  const store: StoreKind = process.env.CAIRN_STORE === "postgres" ? "postgres" : "memory";
  const models: GatewayModelConfig = {
    default: process.env.AI_DEFAULT_MODEL || "example/model-name",
  };

  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_API_BASE_URL;
  const hasRealKey = Boolean(apiKey && baseUrl && apiKey !== "your-api-key-here");

  const transport = hasRealKey
    ? createOpenAiCompatibleTransport({ baseUrl: baseUrl!, apiKey: apiKey!, provider: "openai-compatible" })
    : createMockTransport();

  cached = { store, transport, models, usingRealModel: hasRealKey };
  return cached;
}
