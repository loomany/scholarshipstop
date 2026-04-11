-- Account-synced saved scholarships (Telegram Save button + /account saved list).

create table if not exists public.user_saved_scholarships (
  user_id uuid not null references auth.users (id) on delete cascade,
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, scholarship_id)
);

create index if not exists user_saved_scholarships_user_created_idx
  on public.user_saved_scholarships (user_id, created_at desc);

alter table public.user_saved_scholarships enable row level security;

create policy "Users read own saved scholarships"
  on public.user_saved_scholarships
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own saved scholarships"
  on public.user_saved_scholarships
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users delete own saved scholarships"
  on public.user_saved_scholarships
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
