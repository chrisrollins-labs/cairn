-- 0005 — model-call transcripts.
--
-- One row per model call: the prompt sent and the completion received, so a
-- decision can be reviewed later. Transcripts necessarily contain prompt text
-- (the person's own note), which is exactly why they are kept separate from the
-- audit log — the audit log is metadata-only and references a transcript by id
-- (ADR-003). Transcripts are write-once: insert and select only.

create table public.transcripts (
  id uuid primary key,
  owner_id uuid not null,
  flow text not null,
  model text not null,
  provider text not null,
  prompt_template_id text not null,
  prompt_template_version integer not null,
  messages jsonb not null,
  response text not null,
  prompt_tokens integer not null,
  completion_tokens integer not null,
  zero_data_retention boolean not null,
  created_at bigint not null
);

create index transcripts_owner_created on public.transcripts (owner_id, created_at desc);

alter table public.transcripts enable row level security;
create policy transcripts_owner_select on public.transcripts
  for select using (owner_id = app_current_user_id());
create policy transcripts_owner_insert on public.transcripts
  for insert with check (owner_id = app_current_user_id());
