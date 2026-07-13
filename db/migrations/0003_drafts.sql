-- 0003 - proposals.
--
-- Drafts are where the AI writes. Creating or editing a draft commits nothing a
-- person will see as a record; a draft leaves this table only by an explicit
-- human decision recorded in `status` (ADR-001). Drafts are mutable (edit,
-- decide), so they carry an update policy; records do not.

create table public.drafts (
  id uuid primary key,
  owner_id uuid not null,
  origin text not null check (origin in ('ai', 'human')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  title text not null,
  body text not null,
  ai jsonb,
  source_note text not null default '',
  created_at bigint not null,
  decided_at bigint,
  resulting_record_id uuid
);

create index drafts_owner_status on public.drafts (owner_id, status, created_at desc);

alter table public.drafts enable row level security;
create policy drafts_owner_select on public.drafts
  for select using (owner_id = app_current_user_id());
create policy drafts_owner_insert on public.drafts
  for insert with check (owner_id = app_current_user_id());
create policy drafts_owner_update on public.drafts
  for update using (owner_id = app_current_user_id())
  with check (owner_id = app_current_user_id());
