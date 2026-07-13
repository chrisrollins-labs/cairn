# 009 - In-memory by default, Postgres behind one seam, offline deterministic tests

**Status:** Accepted

## Context

A reference implementation people can actually run beats one they have to
provision a database and an API key to try. But the patterns on show - RLS,
the DB-sealed chain - are real database concerns. We want both: zero-friction to
run, and a genuine Postgres path.

## Decision

Everything that touches storage or a model depends on a narrow seam - the store
interfaces, the `QueryExecutor`, the `AuditLog`, and the `AiTransport`. The
default runtime wires in-memory stores, the TypeScript audit chain, and a
deterministic mock transport, so the whole app and the entire test suite run
with **no database, no network, and no secrets**. Choosing Postgres is a
decision made once, at the composition root; nothing downstream changes.

## Consequences

- `git clone && npm install && npm run dev` just works, and `npm test` is safe to
  run anywhere.
- Tests are deterministic: time and identity are injected (a fixed clock, a
  counter), the transport is scripted, and the DB adapters are tested against a
  scripted executor that records SQL and params.
- The Postgres audit chain is enforced by triggers rather than the app, so the
  two backends are not identical in mechanism - that difference is deliberate and
  documented (ADR-002).
