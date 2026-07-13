import { canonicalize } from "@/shared/canonical";
import { sha256Hex } from "@/shared/hash";
import type { AuditEventPreimageFields } from "./event";

/**
 * The chain protocol.
 *
 * An event's hash is SHA-256 over the newline-joined preimage below, in exactly
 * this field order. Every field is either a hash, a number, a UUID, an enum, or
 * canonical JSON — none can contain a raw newline — so the join is unambiguous.
 *
 * This is the single definition of "how a link is computed". `hashEvent` is
 * called by both the writer (AuditChain.append) and the verifier
 * (AuditChain.verify), so the two can never drift. The same field order is
 * reproduced by the SQL trigger in db/migrations and documented in
 * docs/AUDIT.md, so the chain can be re-derived from the raw rows in either
 * implementation.
 */
export function auditPreimage(e: AuditEventPreimageFields): string {
  return [
    e.prevHash,
    String(e.seq),
    e.ownerId,
    String(e.at),
    e.type,
    e.subjectId,
    canonicalize(e.metadata),
  ].join("\n");
}

export function hashEvent(e: AuditEventPreimageFields): string {
  return sha256Hex(auditPreimage(e));
}
