import { describe, expect, it } from "vitest";
import { extractJsonObject } from "@/core/ai/json";

describe("extractJsonObject", () => {
  it("parses a bare JSON object", () => {
    expect(extractJsonObject('{"title":"T","body":"B"}')).toEqual({ title: "T", body: "B" });
  });

  it("unwraps a ```json fenced block", () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("pulls an object out of surrounding prose", () => {
    expect(extractJsonObject('Here you go: {"a":1} — hope that helps')).toEqual({ a: 1 });
  });

  it("throws when there is no object", () => {
    expect(() => extractJsonObject("no json here")).toThrow();
  });
});
