-- Optional catalog fields for US-market filters, chips, and parser backfill.
alter table public.scholarships
  add column if not exists eligibility_tags jsonb default '[]'::jsonb,
  add column if not exists catalog_education_levels jsonb default '[]'::jsonb,
  add column if not exists gpa_requirement_min numeric,
  add column if not exists gpa_bucket text,
  add column if not exists easy_apply_flags jsonb default '[]'::jsonb,
  add column if not exists location_tags jsonb default '[]'::jsonb,
  add column if not exists listing_completeness_score integer,
  add column if not exists listing_completeness_bucket text,
  add column if not exists applicants_count_is_estimated boolean default false;

comment on column public.scholarships.eligibility_tags is 'Normalized eligibility tag ids (e.g. women, first_generation); UI derives if empty.';
comment on column public.scholarships.catalog_education_levels is 'Education level ids separate from study_levels when explicitly curated.';
