import { describe, expect, it } from "vitest";
import { canonicalize } from "@/shared/canonical";

describe("canonicalize", () => {
  it("orders object keys deterministically regardless of insertion order", () => {
    const a = canonicalize({ b: 1, a: 2, c: 3 });
    const b = canonicalize({ c: 3, a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1,"c":3}');
  });

  it("recurses into nested objects and arrays", () => {
    expect(canonicalize({ z: [{ y: 1, x: 2 }], a: null })).toBe('{"a":null,"z":[{"x":2,"y":1}]}');
  });

  it("escapes strings so delimiters can never be forged", () => {
    expect(canonicalize({ k: "a\nb" })).toBe('{"k":"a\\nb"}');
  });

  it("rejects non-finite numbers and undefined values", () => {
    expect(() => canonicalize({ n: Number.NaN } as never)).toThrow();
    expect(() => canonicalize({ u: undefined } as never)).toThrow();
  });
});
