# Tenancy and Row-Level Security

Every row belongs to exactly one user, and no user can see another's rows. This
is enforced at the database, not in application `where` clauses.

## The GUC model

The app sets a per-request GUC to the authenticated user id:

```sql
select set_config('app.user_id', $1, true);
```

Every RLS policy compares against a single helper:

```sql
create function app_current_user_id() returns uuid
  language sql stable
as $$ select nullif(current_setting('app.user_id', true), '')::uuid; $$;
```

Because `set_config(..., true)` is local to the transaction on that connection,
a connection can only ever see the tenant it was scoped to. `withTenant` (in
`src/core/db/pg-executor.ts`) is the request-scoped pattern: check out a
connection, pin `app.user_id`, run the work, release.

## Policies live with their tables

RLS is enabled and its policies are written in the **same migration** that
creates each table:

- **User-owned tables** (`records`, `drafts`, `assessments`, `transcripts`) scope
  every operation to `owner_id = app_current_user_id()`.
- **The audit table** allows only `select` and `insert` for the owner - no update
  or delete policy - so history is append-only at the policy layer, on top of the
  immutability trigger.

A CI gate (`scripts/check-rls-coverage.mjs`) statically parses the migrations and
fails the build if any application-schema table lacks RLS or a policy. It runs
with no database, so it is always on.

## In memory

The in-memory backend enforces the same contract in code: every read filters by
`ownerId`. This is why the offline tests can assert the isolation guarantee (one
tenant cannot see another's records or audit chain) without a database - the
behavior is identical to the RLS-enforced path.

## What is out of scope

Authentication is not implemented. A real deployment would resolve the current
user from an authenticated session - MFA, WebAuthn passkeys, idle-lock, and
re-auth gates on sensitive actions are the natural additions and the intended
plug-in point. This reference ships a demo session (`src/server/session.ts`) that
supplies a current user id and nothing more, because the tenant id is all the
isolation and audit-chain machinery actually needs.
