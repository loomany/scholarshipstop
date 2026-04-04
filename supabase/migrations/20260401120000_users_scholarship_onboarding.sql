-- Onboarding / matching fields live on public.profiles (not public.users).
-- public.profiles must already exist and be keyed by auth.users.id.

alter table public.users
  drop column if exists birth_month,
  drop column if exists birth_day,
  drop column if exists birth_year,
  drop column if exists date_of_birth,
  drop column if exists school_level,
  drop column if exists school_level_label,
  drop column if exists field_of_study,
  drop column if exists field_of_study_label,
  drop column if exists onboarding_completed;

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists birth_month smallint,
  add column if not exists birth_day smallint,
  add column if not exists birth_year smallint,
  add column if not exists date_of_birth date,
  add column if not exists school_level text,
  add column if not exists school_level_label text,
  add column if not exists field_of_study text,
  add column if not exists field_of_study_label text,
  add column if not exists onboarding_completed boolean default false;
