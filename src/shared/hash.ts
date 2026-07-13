import { createHash } from "node:crypto";

/**
 * SHA-256, hex-encoded. One function, used by both the chain writer and the
 * chain verifier (ADR-002), so there is no way for "how we wrote it" and "how
 * we check it" to drift apart.
 */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * The genesis link. The first event in every per-user chain points at this
 * fixed value instead of a previous hash, so "is this the first event?" and
 * "has the head been truncated?" are answerable from the data alone.
 */
export const GENESIS_HASH = "0".repeat(64);
