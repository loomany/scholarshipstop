-- Weighted similarity for "Similar scholarships" (catalog detail).
-- Scoring: +10 same category_slug, +5 state_codes match, +5 open deadline (deadline_date >= CURRENT_DATE).

create or replace function public.get_scored_similar_scholarships(
  target_id uuid,
  target_category_slug text,
  target_state_slug text default null
)
returns setof public.scholarships
language sql
stable
security invoker
set search_path = public
as $$
  select s.*
  from public.scholarships s
  where coalesce(s.is_active, false) = true
    and s.id <> target_id
  order by
    (
      (
        case
          when nullif(trim(target_category_slug), '') is not null
            and lower(trim(coalesce(s.category_slug, ''))) = lower(trim(target_category_slug))
          then 10
          else 0
        end
      )
      + (
        case
          when nullif(trim(target_state_slug), '') is not null
            and coalesce(s.state_codes, '[]'::jsonb) @> jsonb_build_array(upper(trim(target_state_slug)))
          then 5
          else 0
        end
      )
      + (
        case
          when s.deadline_date is not null
            and s.deadline_date >= current_date
          then 5
          else 0
        end
      )
    ) desc,
    s.deadline_date asc nulls last
  limit 10;
$$;

comment on function public.get_scored_similar_scholarships(uuid, text, text) is
  'Scores active scholarships vs target: category +10, state_codes +5, open deadline +5; returns top 10.';

grant execute on function public.get_scored_similar_scholarships(uuid, text, text) to anon;
grant execute on function public.get_scored_similar_scholarships(uuid, text, text) to authenticated;
grant execute on function public.get_scored_similar_scholarships(uuid, text, text) to service_role;
