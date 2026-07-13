-- 0006 — the tamper-evident audit chain, enforced in the database.
--
-- This is the Postgres implementation of the same protocol the TypeScript core
-- implements (src/core/audit). The point of doing it here as well is defense in
-- depth: with the chain sealed by a trigger, even an application bug — or a
-- compromised service credential — cannot rewrite history undetected. The
-- server owns seq, prev_hash, and hash; any client-supplied values are
-- discarded and recomputed on insert, and updates and deletes are refused
-- outright.
--
-- The exact byte form of the preimage here (metadata rendered as jsonb text)
-- differs from the TypeScript canonicalization, and that is fine: each
-- implementation is internally consistent because its writer and its verifier
-- call the SAME hash function. The protocol — the field order below — is shared
-- and documented in docs/AUDIT.md, so the chain can be re-derived from the raw
-- rows in either. (ADR-002)

create table public.audit_events (
  owner_id uuid not null,
  seq bigint not null,
  at_ms bigint not null,
  event_type text not null,
  subject_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  prev_hash text not null,
  hash text not null,
  primary key (owner_id, seq)
);

alter table public.audit_events enable row level security;
create policy audit_events_owner_select on public.audit_events
  for select using (owner_id = app_current_user_id());
create policy audit_events_owner_insert on public.audit_events
  for insert with check (owner_id = app_current_user_id());
-- Deliberately no update or delete policy: history cannot be rewritten through
-- the API. The immutability trigger below blocks it even for the table owner.

-- The single definition of "how a link is computed". Called by both the sealing
-- trigger and the verifier, so the two can never drift.
create or replace function audit_hash(
  p_prev_hash text,
  p_seq bigint,
  p_owner uuid,
  p_at_ms bigint,
  p_type text,
  p_subject text,
  p_metadata jsonb
) returns text
  language sql
  immutable
as $$
  select encode(
    digest(
      p_prev_hash || E'\n' || p_seq::text || E'\n' || p_owner::text || E'\n'
        || p_at_ms::text || E'\n' || p_type || E'\n' || p_subject || E'\n'
        || p_metadata::text,
      'sha256'
    ),
    'hex'
  );
$$;

-- On insert, compute the chain fields server-side under a per-owner lock so two
-- concurrent appends cannot read the same head and fork the chain.
create or replace function audit_events_seal_fn() returns trigger
  language plpgsql
as $$
declare
  v_prev record;
  v_seq bigint;
  v_prev_hash text;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));

  select seq, hash into v_prev
  from public.audit_events
  where owner_id = new.owner_id
  order by seq desc
  limit 1;

  if not found then
    v_seq := 1;
    v_prev_hash := repeat('0', 64);
  else
    v_seq := v_prev.seq + 1;
    v_prev_hash := v_prev.hash;
  end if;

  new.seq := v_seq;
  new.prev_hash := v_prev_hash;
  new.hash := audit_hash(
    v_prev_hash, v_seq, new.owner_id, new.at_ms,
    new.event_type, new.subject_id, new.metadata
  );
  return new;
end;
$$;

create trigger audit_events_seal
  before insert on public.audit_events
  for each row execute function audit_events_seal_fn();

-- Append-only enforcement: refuse any update or delete.
create or replace function audit_events_immutable_fn() returns trigger
  language plpgsql
as $$
begin
  raise exception 'audit_events is append-only; % is not permitted', tg_op;
end;
$$;

create trigger audit_events_no_change
  before update or delete on public.audit_events
  for each row execute function audit_events_immutable_fn();

-- Re-derive the caller's chain from the raw rows and report the first break, if
-- any. Self-only: it verifies the current tenant's chain (app_current_user_id),
-- and RLS restricts the rows it can read to that same tenant.
create or replace function verify_audit_chain()
  returns table(ok boolean, length integer, head_hash text, broken_at bigint, reason text)
  language plpgsql
  stable
  security invoker
as $$
declare
  v_owner uuid := app_current_user_id();
  r record;
  v_prev_hash text := repeat('0', 64);
  v_expected_seq bigint := 1;
  v_len integer := 0;
  v_recomputed text;
begin
  for r in
    select * from public.audit_events where owner_id = v_owner order by seq asc
  loop
    v_len := v_len + 1;

    if r.seq <> v_expected_seq then
      return query select false, v_len, null::text, r.seq,
        format('expected seq %s, found %s', v_expected_seq, r.seq);
      return;
    end if;

    if r.prev_hash <> v_prev_hash then
      return query select false, v_len, null::text, r.seq,
        'prev_hash does not match the previous event''s hash'::text;
      return;
    end if;

    v_recomputed := audit_hash(
      r.prev_hash, r.seq, r.owner_id, r.at_ms, r.event_type, r.subject_id, r.metadata
    );
    if v_recomputed <> r.hash then
      return query select false, v_len, null::text, r.seq,
        'stored hash does not match recomputed hash'::text;
      return;
    end if;

    v_prev_hash := r.hash;
    v_expected_seq := v_expected_seq + 1;
  end loop;

  return query select true, v_len,
    case when v_len = 0 then null else v_prev_hash end, null::bigint, null::text;
end;
$$;
