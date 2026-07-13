import { describe, expect, it } from "vitest";
import { createOpenAiCompatibleTransport } from "@/core/ai/providers/openai-compatible";

interface Captured {
  url: string;
  body: unknown;
  authorization: string | null;
}

function fetchStub(payload: unknown, status = 200): {
  fetchImpl: typeof fetch;
  captured: () => Captured | null;
} {
  let captured: Captured | null = null;
  const fetchImpl = (async (url: string, init: RequestInit) => {
    captured = {
      url,
      body: JSON.parse(init.body as string),
      authorization: new Headers(init.headers).get("authorization"),
    };
    return new Response(JSON.stringify(payload), { status });
  }) as unknown as typeof fetch;
  return { fetchImpl, captured: () => captured };
}

const OK_PAYLOAD = {
  choices: [{ message: { content: "hello" } }],
  usage: { prompt_tokens: 10, completion_tokens: 4 },
};

describe("openai-compatible transport", () => {
  it("sends zero-data-retention flags and bearer auth, and parses the reply", async () => {
    const stub = fetchStub(OK_PAYLOAD);
    const transport = createOpenAiCompatibleTransport({
      baseUrl: "https://api.example-provider.com/v1",
      apiKey: "unit-test-key",
      fetchImpl: stub.fetchImpl,
      provider: "test",
    });

    const result = await transport.complete({
      model: "example/model-name",
      messages: [{ role: "user", content: "hi" }],
      zeroDataRetention: true,
    });

    const body = stub.captured()!.body as { store: boolean; provider: { zdr: boolean } };
    expect(body.store).toBe(false);
    expect(body.provider.zdr).toBe(true);
    expect(stub.captured()!.url).toBe("https://api.example-provider.com/v1/chat/completions");
    expect(stub.captured()!.authorization).toBe("Bearer unit-test-key");
    expect(result.text).toBe("hello");
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 4 });
  });

  it("refuses to send when zero-data-retention is false", async () => {
    const stub = fetchStub(OK_PAYLOAD);
    const transport = createOpenAiCompatibleTransport({
      baseUrl: "https://x/v1",
      apiKey: "k",
      fetchImpl: stub.fetchImpl,
    });
    await expect(
      transport.complete({ model: "m", messages: [], zeroDataRetention: false }),
    ).rejects.toThrow(/zeroDataRetention/);
    expect(stub.captured()).toBeNull();
  });

  it("throws on a non-2xx response", async () => {
    const stub = fetchStub({}, 500);
    const transport = createOpenAiCompatibleTransport({
      baseUrl: "https://x/v1",
      apiKey: "k",
      fetchImpl: stub.fetchImpl,
    });
    await expect(
      transport.complete({ model: "m", messages: [], zeroDataRetention: true }),
    ).rejects.toThrow(/HTTP 500/);
  });
});
