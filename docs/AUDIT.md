# The audit chain: what it proves, and what it does not

The audit chain is the trust substrate of this project. This document states its
protocol precisely and is honest about its limits - an audit control you cannot
describe exactly is not one you can rely on.

## The protocol

Every user has their own chain. Each event has:

| field | meaning |
| --- | --- |
| `ownerId` | the tenant; chains never cross users |
| `seq` | 1-based, contiguous position in this user's chain |
| `at` | epoch milliseconds the event was recorded |
| `type` | a dotted event type (`draft.proposed`, `record.committed`, …) |
| `subjectId` | the id of the record/draft/assessment the event is about |
| `metadata` | IDs / enums / counts / hashes only - never record content |
| `prevHash` | the previous event's `hash`, or 64 zeros for `seq` 1 |
| `hash` | SHA-256 of the preimage below |

The **preimage** is these fields, newline-joined, in exactly this order:

```
prevHash
seq
ownerId
at
type
subjectId
canonical(metadata)
```

Every field is a hash, a number, a UUID, an enum, or canonical JSON - none can
contain a raw newline - so the join is unambiguous. `hash = SHA-256(preimage)`.
The one function that computes this (`hashEvent`) is called by **both the writer
and the verifier**, so "how we wrote it" and "how we check it" cannot drift.

## Verification

`verify(ownerId)` reads the raw rows and walks them from `seq` 1, checking that
seqs are contiguous, that each `prevHash` matches the previous `hash`, and that
each stored `hash` recomputes from its fields. The first failure is reported with
its position and reason. Verification is read-only: checking the chain can never
change it.

Alter a field of any event, and its stored hash no longer recomputes - caught at
that event. Swap a stored hash, and the next event's `prevHash` no longer
matches - caught there. Drop or reorder an event, and the `seq` sequence breaks -
caught there.

## Two implementations, one protocol

- **TypeScript** (`src/core/audit`) computes and verifies the chain in the app.
  It is the default runtime and what the tests and the UI's verifier exercise.
- **Postgres** (`db/migrations/0006`) enforces the same protocol in the database:
  a `BEFORE INSERT` trigger assigns `seq`, `prev_hash`, and `hash` (discarding any
  client-supplied values), a trigger refuses `UPDATE` and `DELETE`, and
  `verify_audit_chain()` recomputes with the same SQL hash function the trigger
  used.

The two are each **internally consistent** - within each, the writer and verifier
share one hash function. They are **not required to produce byte-identical
hashes**: the TypeScript side canonicalizes metadata with a stable JSON
serializer, while the SQL side renders it as `jsonb` text. The invariant is the
protocol (the field order above), not a specific language's bytes, so the chain
can be re-derived from the raw rows in either.

## Chain of custody beyond the log

- Each committed record carries a **content hash** (SHA-256 of its canonical
  `{title, body}`). The `record.committed` event stores that hash, so the log can
  prove which bytes were approved without holding a copy of them.
- Audit metadata references a **transcript id** for anything a model produced;
  the transcript (which contains the prompt) lives in its own RLS-scoped table
  and is never copied into the chain.

## What this does not prove

Being explicit about the boundaries:

- **No external time anchoring.** `at` is the server's clock at write time. The
  chain proves ordering and integrity *relative to itself*, not that an event
  occurred before some external moment. Anchoring the head hash to a third party
  (e.g. an RFC-3161 timestamp authority or a public ledger) is a natural
  extension and is intentionally out of scope here.
- **Write-time trust.** The chain guarantees that once written, events cannot be
  altered undetectably. It does not adjudicate whether the application told the
  truth at the instant of writing - that is the job of the review gate and the
  provenance it stamps, not the chain.
- **Single-node ordering.** `seq` is assigned per owner under a lock (a per-owner
  advisory lock in Postgres; single-threaded in memory). This is ordering within
  one logical writer, not distributed consensus.

None of these limits weaken the core guarantee - *the recorded history cannot be
edited after the fact without detection* - but naming them is part of making the
control trustworthy.
