-- Questionnaire answers and generated essays (academic essay SaaS).

create table public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stage1_data jsonb,
  stage2_data jsonb,
  stage3_data jsonb,
  stage4_data jsonb,
  rubric_weights jsonb,
  created_at timestamptz not null default now()
);

create index questionnaire_responses_user_id_created_at_idx
  on public.questionnaire_responses (user_id, created_at desc);

alter table public.questionnaire_responses enable row level security;

create policy "Users select own questionnaire responses"
  on public.questionnaire_responses
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own questionnaire responses"
  on public.questionnaire_responses
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own questionnaire responses"
  on public.questionnaire_responses
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own questionnaire responses"
  on public.questionnaire_responses
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table public.essay_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  response_id uuid not null references public.questionnaire_responses (id) on delete cascade,
  content text not null,
  version integer not null default 1,
  grinder_notes text,
  created_at timestamptz not null default now()
);

create index essay_results_user_id_created_at_idx
  on public.essay_results (user_id, created_at desc);

create index essay_results_response_id_idx
  on public.essay_results (response_id);

alter table public.essay_results enable row level security;

-- Prevent linking an essay to another user's questionnaire row.
create policy "Users select own essay results"
  on public.essay_results
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own essay results"
  on public.essay_results
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.questionnaire_responses r
      where r.id = response_id
        and r.user_id = (select auth.uid())
    )
  );

create policy "Users update own essay results"
  on public.essay_results
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.questionnaire_responses r
      where r.id = response_id
        and r.user_id = (select auth.uid())
    )
  );

create policy "Users delete own essay results"
  on public.essay_results
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
