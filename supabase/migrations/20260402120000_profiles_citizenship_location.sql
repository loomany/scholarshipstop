alter table public.profiles
  add column if not exists citizenship_slug text,
  add column if not exists country_code text,
  add column if not exists state_region text,
  add column if not exists city text;
