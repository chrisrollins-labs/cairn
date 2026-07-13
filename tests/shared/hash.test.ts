import { describe, expect, it } from "vitest";
import { GENESIS_HASH, sha256Hex } from "@/shared/hash";

describe("sha256Hex", () => {
  it("matches the known SHA-256 vector for the empty string", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("matches the known vector for 'abc'", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("is deterministic", () => {
    expect(sha256Hex("cairn")).toBe(sha256Hex("cairn"));
  });
});

describe("GENESIS_HASH", () => {
  it("is 64 hex zeros", () => {
    expect(GENESIS_HASH).toBe("0".repeat(64));
  });
});
