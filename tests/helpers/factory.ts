import { createMockTransport } from "@/core/ai/providers/mock";
import type { AiTransport } from "@/core/ai/transport";
import { createService } from "@/core/runtime";
import type { RecordsService } from "@/core/records/service";
import { createMemoryStores } from "@/core/store/memory";
import type { Stores } from "@/core/store/interfaces";
import type { Clock, IdGen } from "@/shared/clock";

/** A clock that starts fixed and advances a step on every read. Deterministic. */
export function fixedClock(start = 1_700_000_000_000, step = 1_000): Clock {
  let t = start;
  return () => {
    const now = t;
    t += step;
    return now;
  };
}

/** A counter id generator: id-0001, id-0002, ... Deterministic and readable. */
export function counterIds(prefix = "id"): IdGen {
  let n = 0;
  return () => `${prefix}-${String(++n).padStart(4, "0")}`;
}

/** A transport that returns queued texts in order (for the retry/edge tests). */
export function scriptedTransport(texts: string[], provider = "scripted"): AiTransport {
  let i = 0;
  return {
    async complete(request) {
      const text = texts[i++] ?? "";
      return {
        text,
        model: request.model,
        provider,
        usage: { promptTokens: 1, completionTokens: 1 },
      };
    },
  };
}

export interface TestHarness {
  readonly service: RecordsService;
  readonly stores: Stores;
}

export function makeService(overrides?: {
  transport?: AiTransport;
  clock?: Clock;
  newId?: IdGen;
}): TestHarness {
  const stores = createMemoryStores();
  const service = createService({
    stores,
    transport: overrides?.transport ?? createMockTransport(),
    models: { default: "example/model-name" },
    clock: overrides?.clock ?? fixedClock(),
    newId: overrides?.newId ?? counterIds(),
  });
  return { service, stores };
}

export const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
