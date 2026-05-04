-- Exclude compare battle paths from seo_generation_sitemap_paths: those URLs are canonical
-- under /compare/states/... and /compare/universities/... (compare sitemap RPCs), not under
-- /scholarships/compare/... . Application sitemap builders also skip these queue rows.

create or replace function public.seo_generation_sitemap_paths(p_min_grants integer default 3)
returns table (canonical_path text, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select q.canonical_path, q.updated_at
  from public.seo_generation_queue q
  where q.status = 'completed'
    and coalesce(q.grant_count, 0) > p_min_grants
    and lower(trim(both '/' from q.canonical_path)) not like 'compare/states%'
    and lower(trim(both '/' from q.canonical_path)) not like 'compare/universities%';
$$;

comment on function public.seo_generation_sitemap_paths(integer) is
  'Public-safe list of generated hub paths for XML sitemap (excludes compare battle paths; those use compare sitemap RPCs).';
