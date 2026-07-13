import { describe, expect, it } from "vitest";
import { AiGateway } from "@/core/ai/gateway";
import type { AiTransport } from "@/core/ai/transport";
import type { AiCompletionRequest } from "@/core/ai/types";
import { createMemoryStores } from "@/core/store/memory";
import { counterIds, fixedClock } from "../helpers/factory";

/** A transport that records the last request and echoes a fixed reply. */
function recordingTransport(): { transport: AiTransport; last: () => AiCompletionRequest | null } {
  let last: AiCompletionRequest | null = null;
  return {
    last: () => last,
    transport: {
      async complete(request) {
        last = request;
        return {
          text: "ok",
          model: request.model,
          provider: "recording",
          usage: { promptTokens: 3, completionTokens: 1 },
        };
      },
    },
  };
}

function makeGateway(transport: AiTransport, models = { default: "m-default" }) {
  const stores = createMemoryStores();
  const gateway = new AiGateway({
    transport,
    transcripts: stores.transcripts,
    clock: fixedClock(),
    newId: counterIds("tx"),
    models,
  });
  return { gateway, stores };
}

describe("AiGateway", () => {
  it("forces zero-data-retention on every call", async () => {
    const rec = recordingTransport();
    const { gateway } = makeGateway(rec.transport);
    await gateway.run({
      ownerId: "u1",
      flow: "draft_entry",
      templateId: "draft_entry",
      templateVersion: 1,
      messages: [{ role: "user", content: "hi" }],
    });
    expect(rec.last()?.zeroDataRetention).toBe(true);
  });

  it("writes a transcript for every call, with provenance", async () => {
    const rec = recordingTransport();
    const { gateway, stores } = makeGateway(rec.transport);
    const result = await gateway.run({
      ownerId: "u1",
      flow: "assess_entry",
      templateId: "assess_entry",
      templateVersion: 2,
      messages: [{ role: "user", content: "hi" }],
    });
    const transcript = await stores.transcripts.get("u1", result.origin.transcriptId);
    expect(transcript).not.toBeNull();
    expect(transcript!.flow).toBe("assess_entry");
    expect(transcript!.promptTemplateVersion).toBe(2);
    expect(transcript!.zeroDataRetention).toBe(true);
    expect(result.origin.promptTokens).toBe(3);
  });

  it("routes each flow to its configured model", async () => {
    const rec = recordingTransport();
    const { gateway } = makeGateway(rec.transport, {
      default: "m-default",
      perFlow: { assess_entry: "m-assess" },
    });
    await gateway.run({ ownerId: "u", flow: "draft_entry", templateId: "t", templateVersion: 1, messages: [] });
    expect(rec.last()?.model).toBe("m-default");
    await gateway.run({ ownerId: "u", flow: "assess_entry", templateId: "t", templateVersion: 1, messages: [] });
    expect(rec.last()?.model).toBe("m-assess");
  });

  it("refuses a flow that is not allow-listed", async () => {
    const rec = recordingTransport();
    const { gateway } = makeGateway(rec.transport);
    await expect(
      gateway.run({
        ownerId: "u",
        // deliberately bypass the type to exercise the runtime guard
        flow: "exfiltrate" as never,
        templateId: "t",
        templateVersion: 1,
        messages: [],
      }),
    ).rejects.toThrow(/allow-listed/);
  });
});
