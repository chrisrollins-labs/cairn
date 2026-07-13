# 003 — Audit events carry metadata only, never record content

**Status:** Accepted

## Context

It is tempting to put the whole record into its audit event, so the log is
self-contained. But that turns the audit log into a second, sprawling copy of
the very data it describes — doubling the surface for a leak and blurring the
line between "the record" and "the proof about the record".

## Decision

Audit event metadata is IDs, enums, counts, and hashes only. To reference the
content that was committed, an event stores its **content hash**, not its text.
To reference what a model saw, it stores a **transcript id**, not the prompt.
The transcript (which does contain the note text) lives in its own table, is
per-user and RLS-scoped, and is never copied into the chain.

## Consequences

- The audit chain proves *that* something happened, in what order, over exactly
  which bytes (by hash) — without being a place content can leak from.
- A record's text can be produced and matched against the hash in its
  `record.committed` event, so provenance is verifiable without duplication.
- The `canonicalize` serializer forbids non-JSON values, keeping metadata to the
  small, safe shapes this decision assumes.
