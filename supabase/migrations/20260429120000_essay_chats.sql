-- AI interviewer chats + optional link from essay_results to chat (instead of questionnaire only).

create table public.essay_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  progress jsonb not null default '{"background":0,"achievements":0,"gap":0,"personality":0}'::jsonb,
  ready_to_generate boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index essay_chats_user_id_created_at_idx
  on public.essay_chats (user_id, created_at desc);

alter table public.essay_chats enable row level security;

create policy "Users select own essay chats"
  on public.essay_chats
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own essay chats"
  on public.essay_chats
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own essay chats"
  on public.essay_chats
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own essay chats"
  on public.essay_chats
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

alter table public.essay_results alter column response_id drop not null;

alter table public.essay_results add column essay_chat_id uuid references public.essay_chats (id) on delete cascade;

create index essay_results_essay_chat_id_idx on public.essay_results (essay_chat_id);

alter table public.essay_results add constraint essay_results_questionnaire_or_chat_check check (
  (response_id is not null and essay_chat_id is null)
  or (response_id is null and essay_chat_id is not null)
);

drop policy if exists "Users insert own essay results" on public.essay_results;
drop policy if exists "Users update own essay results" on public.essay_results;

create policy "Users insert own essay results"
  on public.essay_results
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      (
        response_id is not null
        and essay_chat_id is null
        and exists (
          select 1
          from public.questionnaire_responses r
          where r.id = response_id
            and r.user_id = (select auth.uid())
        )
      )
      or (
        response_id is null
        and essay_chat_id is not null
        and exists (
          select 1
          from public.essay_chats c
          where c.id = essay_chat_id
            and c.user_id = (select auth.uid())
        )
      )
    )
  );

create policy "Users update own essay results"
  on public.essay_results
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      (
        response_id is not null
        and essay_chat_id is null
        and exists (
          select 1
          from public.questionnaire_responses r
          where r.id = response_id
            and r.user_id = (select auth.uid())
        )
      )
      or (
        response_id is null
        and essay_chat_id is not null
        and exists (
          select 1
          from public.essay_chats c
          where c.id = essay_chat_id
            and c.user_id = (select auth.uid())
        )
      )
    )
  );
