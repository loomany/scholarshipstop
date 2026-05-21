-- Local/CI bootstrap: public.profiles exists on hosted DB but was never in migration history.
-- Safe on hosted: CREATE TABLE IF NOT EXISTS only.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade
);

alter table public.profiles enable row level security;
