import { canonicalize } from "@/shared/canonical";
import { sha256Hex } from "@/shared/hash";

/**
 * The content hash of a record: SHA-256 over the canonical {title, body}. This
 * is the record's chain-of-custody anchor - the audit event for a commit stores
 * this hash, not the text, so the log can prove exactly which bytes were
 * approved without ever holding a second copy of the content (ADR-003).
 */
export function computeContentHash(title: string, body: string): string {
  return sha256Hex(canonicalize({ title, body }));
}
