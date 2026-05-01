-- Auth signup must not fail because the legacy public.users mirror row cannot be written.
-- Supabase Auth reports trigger failures as a vague "Internal Server Error", so keep
-- this trigger best-effort and let the app create/update public.profiles separately.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, public.users.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);

  return new;
exception
  when others then
    raise warning 'handle_new_user skipped for auth user %: %', new.id, sqlerrm;
    return new;
end;
$$;
