-- Remove retired weekly free digest state.

drop table if exists public.weekly_free_digest_sent;

alter table public.profiles
  drop column if exists email_weekly_free_digest;
