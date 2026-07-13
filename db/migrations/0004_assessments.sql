-- 0004 — labeled AI artifacts.
--
-- An assessment is a separate, versioned, AI-authored artifact about a record.
-- It is never merged into the record's body and is always labeled
-- ai_generated (ADR-007). A new assessment deactivates the prior active one for
-- that record, so the update policy is needed for the deactivation.

create table public.assessments (
  id uuid primary key,
  owner_id uuid not null,
  record_id uuid not null,
  version integer not null,
  active boolean not null default true,
  body text not null,
  ai jsonb not null,
  label text not null default 'ai_generated' check (label = 'ai_generated'),
  created_at bigint not null
);

create index assessments_owner_record on public.assessments (owner_id, record_id, version desc);

alter table public.assessments enable row level security;
create policy assessments_owner_select on public.assessments
  for select using (owner_id = app_current_user_id());
create policy assessments_owner_insert on public.assessments
  for insert with check (owner_id = app_current_user_id());
create policy assessments_owner_update on public.assessments
  for update using (owner_id = app_current_user_id())
  with check (owner_id = app_current_user_id());
