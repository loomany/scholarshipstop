-- Onboarding sync (client + /auth/callback) upserts public.profiles with the user's JWT.
-- Without INSERT/UPDATE policies, PostgREST rejects the upsert and the account stays empty.

alter table public.profiles enable row level security;

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile."
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile."
  on public.profiles
  for update
  using (auth.uid() = id);
