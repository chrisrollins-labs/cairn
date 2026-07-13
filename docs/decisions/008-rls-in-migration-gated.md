# 008 — RLS in the same migration as each table, gated in CI

**Status:** Accepted

## Context

Multi-tenant isolation enforced only in application code is one forgotten
`where` clause away from a breach. Row-Level Security pushes isolation into the
database — but only if every table actually has a policy, and "add policies
later" is exactly how a table ships without one.

## Decision

Enable RLS and write its policies in the **same migration** that creates each
table. Tenancy is GUC-based: the app sets `app.user_id` per request (via a
connection-scoped `set_config`), and every policy compares against
`app_current_user_id()`. A CI gate (`scripts/check-rls-coverage.mjs`) statically
parses the migrations and fails the build if any table in an application schema
lacks RLS or a policy. The audit table additionally has no update or delete
policy, so history is append-only at the policy layer as well as by trigger.

## Consequences

- Isolation is structural and provably present, not aspirational — and the check
  runs with no database, so it is fast and always on.
- The in-memory backend enforces the same isolation in code (`where ownerId`), so
  both backends behave identically and the offline tests cover the isolation
  contract.
- A table that legitimately needs an exception goes on an explicit, documented
  allowlist; a silent skip is never allowed.
