create or replace function public.provider_profile_scholarship_aggregate(
  p_provider_slug text
)
returns table (
  total_award_amount numeric,
  known_award_amount_count bigint,
  last_scholarship_updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    sum(s.award_amount_numeric_sort) filter (
      where s.award_amount_numeric_sort is not null
        and s.award_amount_numeric_sort > 0
    ) as total_award_amount,
    count(*) filter (
      where s.award_amount_numeric_sort is not null
        and s.award_amount_numeric_sort > 0
    ) as known_award_amount_count,
    max(s.updated_at) as last_scholarship_updated_at
  from public.scholarships s
  where s.provider_slug = p_provider_slug
    and s.is_active = true;
$$;

grant execute on function public.provider_profile_scholarship_aggregate(text)
  to anon, authenticated;
