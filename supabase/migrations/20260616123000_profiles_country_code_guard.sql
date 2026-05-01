-- Country-first signup stores the applicant country on profiles for matching and digests.
-- Some environments skipped the older citizenship/location migration, so keep this guard late.
alter table public.profiles
  add column if not exists country_code text,
  add column if not exists city text;

comment on column public.profiles.country_code is
  'ISO-3166 alpha-2 country code selected by the user for scholarship eligibility matching.';
