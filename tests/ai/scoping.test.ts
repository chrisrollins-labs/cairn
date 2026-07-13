import { describe, expect, it } from "vitest";
import { scopePriorReflections } from "@/core/ai/scoping";

const RECENT_FIRST = ["r3-newest", "r2", "r1-oldest"];

describe("scopePriorReflections", () => {
  it("includes nothing when prior context is opt-out (the default)", () => {
    expect(scopePriorReflections(RECENT_FIRST, { includePriorContext: false, maxItems: 5, maxChars: 999 })).toEqual([]);
  });

  it("returns chosen items oldest-first when opted in", () => {
    const out = scopePriorReflections(RECENT_FIRST, { includePriorContext: true, maxItems: 5, maxChars: 999 });
    expect(out).toEqual(["r1-oldest", "r2", "r3-newest"]);
  });

  it("caps the number of items, keeping the most recent", () => {
    const out = scopePriorReflections(RECENT_FIRST, { includePriorContext: true, maxItems: 2, maxChars: 999 });
    expect(out).toEqual(["r2", "r3-newest"]);
  });

  it("caps total characters", () => {
    const items = ["aaaa", "bbbb", "cccc"]; // 4 chars each, recent-first
    const out = scopePriorReflections(items, { includePriorContext: true, maxItems: 99, maxChars: 8 });
    expect(out).toEqual(["bbbb", "aaaa"]); // two fit (8 chars), oldest-first
  });
});
