-- Programmatic SEO hub copy cache + state grant counts for sitemap gating.

create table if not exists public.seo_hub_content (
  id uuid primary key default gen_random_uuid(),
  canonical_path text not null,
  title text,
  content_html text,
  cost_of_living_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_hub_content_canonical_path_unique unique (canonical_path)
);

create index if not exists seo_hub_content_updated_at_idx
  on public.seo_hub_content (updated_at desc);

comment on table public.seo_hub_content is 'Cached OpenAI SEO copy for /scholarships hub routes (state guides, cost-of-living JSON).';

alter table public.seo_hub_content enable row level security;

create policy "seo_hub_content_select_public"
  on public.seo_hub_content
  for select
  to anon, authenticated
  using (true);

-- Inserts/updates only via service role (no policy for authenticated insert).

create or replace function public.set_seo_hub_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists seo_hub_content_set_updated_at on public.seo_hub_content;
create trigger seo_hub_content_set_updated_at
  before insert or update on public.seo_hub_content
  for each row
  execute function public.set_seo_hub_content_updated_at();

-- Active scholarships per USPS state code (from jsonb state_codes array). Rows with count > 3 only.
create or replace function public.scholarship_active_counts_by_state_code()
returns table (state_code text, grant_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    upper(trim(elem)) as state_code,
    count(*)::bigint as grant_count
  from public.scholarships s
  cross join lateral jsonb_array_elements_text(coalesce(s.state_codes, '[]'::jsonb)) as elem
  where s.is_active = true
  group by 1
  having count(*) > 3;
$$;

comment on function public.scholarship_active_counts_by_state_code() is
  'Returns state_codes with more than 3 active scholarships (for SEO sitemap).';

grant execute on function public.scholarship_active_counts_by_state_code() to anon, authenticated;
