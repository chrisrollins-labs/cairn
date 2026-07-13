-- 0002 — committed records.
--
-- The user-facing record. A row here only ever comes from the commit path in
-- the application (approving a draft, or authoring directly) — the AI code path
-- has no way to insert one (ADR-001). RLS scopes every row to its owner.

create table public.records (
  id uuid primary key,
  owner_id uuid not null,
  title text not null,
  body text not null,
  source text not null check (source in ('human', 'ai_reviewed')),
  content_hash text not null,
  ai jsonb,
  draft_id uuid,
  approved_by uuid not null,
  created_at bigint not null
);

create index records_owner_created on public.records (owner_id, created_at desc);

alter table public.records enable row level security;
create policy records_owner_select on public.records
  for select using (owner_id = app_current_user_id());
create policy records_owner_insert on public.records
  for insert with check (owner_id = app_current_user_id());
