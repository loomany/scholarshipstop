-- Speed up scholarship hub listing filters and sidebar counts without changing query semantics.
-- These indexes are additive only; they do not alter data, views, or existing country indexes.

create index if not exists scholarships_active_magic_sort_idx
  on public.scholarships (
    ranking_score desc nulls last,
    deadline_date asc nulls last,
    days_until_deadline asc nulls last,
    created_at desc nulls first
  )
  where is_active = true;

create index if not exists scholarships_active_deadline_bucket_idx
  on public.scholarships (
    deadline_bucket,
    deadline_date asc nulls last,
    ranking_score desc nulls last
  )
  where is_active = true
    and deadline_date is not null;

create index if not exists scholarships_active_updated_sort_idx
  on public.scholarships (
    updated_at desc nulls first,
    ranking_score desc nulls last
  )
  where is_active = true;

create index if not exists scholarships_active_award_sort_idx
  on public.scholarships (
    award_amount_numeric_sort desc nulls last,
    ranking_score desc nulls last
  )
  where is_active = true
    and award_amount_numeric_sort is not null;

create index if not exists scholarships_active_requirements_sort_idx
  on public.scholarships (
    (coalesce(requirements_count, 999999)),
    ranking_score desc nulls last
  )
  where is_active = true;

create index if not exists scholarships_active_applicants_sort_idx
  on public.scholarships (
    (coalesce(applicants_count, 999999999)),
    ranking_score desc nulls last
  )
  where is_active = true;

create index if not exists scholarships_active_category_slug_idx
  on public.scholarships (category_slug)
  where is_active = true
    and category_slug is not null;

create index if not exists scholarships_active_easy_apply_flags_gin
  on public.scholarships using gin (easy_apply_flags jsonb_path_ops)
  where is_active = true
    and easy_apply_flags is not null;

create index if not exists scholarships_active_eligibility_tags_gin
  on public.scholarships using gin (eligibility_tags jsonb_path_ops)
  where is_active = true
    and eligibility_tags is not null;

create index if not exists scholarships_active_citizenship_statuses_gin
  on public.scholarships using gin (citizenship_statuses jsonb_path_ops)
  where is_active = true;

create index if not exists scholarships_active_state_codes_gin
  on public.scholarships using gin (state_codes jsonb_path_ops)
  where is_active = true;

create index if not exists scholarships_active_location_tags_gin
  on public.scholarships using gin (location_tags jsonb_path_ops)
  where is_active = true
    and location_tags is not null;

create index if not exists scholarships_active_tags_gin
  on public.scholarships using gin (tags jsonb_path_ops)
  where is_active = true
    and tags is not null;

create index if not exists scholarships_active_seo_tags_gin
  on public.scholarships using gin (seo_tags)
  where is_active = true;
