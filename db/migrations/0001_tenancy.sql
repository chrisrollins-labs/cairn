-- 0001 - extensions and the tenancy helper.
--
-- Migrations are the single source of schema truth (ADR-008): every schema
-- change is an appended, ordered SQL file applied in filename order, never a
-- dashboard edit. This first migration establishes pgcrypto (for the SHA-256
-- used by the audit chain) and the GUC-based tenancy helper the RLS policies
-- build on.

create extension if not exists pgcrypto;

-- Tenancy model (ADR-006): the app sets a per-request GUC to the authenticated
-- user id, and every RLS policy compares against it. Concentrating this in one
-- helper means the policies read the same everywhere and there is one place to
-- audit. A request-scoped connection runs
--   select set_config('app.user_id', $1, true)
-- before any query, so a connection can only ever see one tenant's rows.
create or replace function app_current_user_id() returns uuid
  language sql
  stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$;
