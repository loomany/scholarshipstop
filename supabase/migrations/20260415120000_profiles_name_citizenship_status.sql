-- Onboarding / account: names + citizenship as explicit columns (not only metadata).
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists citizenship_status text,
  add column if not exists citizenship_status_label text;

alter table public.profiles
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles
  add column if not exists updated_at timestamptz default now();

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();
