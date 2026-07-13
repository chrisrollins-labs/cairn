# 002 — A tamper-evident per-user SHA-256 audit chain

**Status:** Accepted

## Context

An audit log that can be edited after the fact proves nothing. If someone can
change a past entry, or drop one, or reorder two, then the log is just another
table. We want "this is the sequence of things that happened, and it has not
been altered" to be checkable from the data alone.

## Decision

Every event carries the hash of the previous event for that user, and its own
hash is SHA-256 over a fixed preimage that includes that link (see
`docs/AUDIT.md` for the exact field order). Chains are strictly per-user. The
**writer and the verifier call the same hash function**, so "how we wrote it"
and "how we check it" cannot drift.

There are two implementations of this one protocol:

- **TypeScript** (`src/core/audit`): computes and verifies the chain in the app,
  over an app-owned store. The default runtime.
- **Postgres** (`db/migrations/0006`): a trigger seals `seq`, `prev_hash`, and
  `hash` on insert and refuses updates and deletes; a SQL function verifies. The
  database enforces the seal even against a compromised application.

## Consequences

- Altering, dropping, or reordering any event breaks every hash from that point
  on, and `verify` reports the exact position of the first break.
- Verification is read-only: checking the chain can never change it.
- The two implementations are each internally consistent; they are not required
  to produce byte-identical hashes (their metadata serialization differs). The
  shared, documented protocol is the field order, so the chain can be re-derived
  from the raw rows in either.
- What this does **not** prove is documented honestly in `docs/AUDIT.md`
  (notably: no external time anchoring — a future direction).
