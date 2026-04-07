-- Scholarship providers: cached AI enrichment + public read for profile pages.

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  display_name text not null,
  official_url text,
  ai_description text,
  ai_sources jsonb not null default '[]'::jsonb,
  ai_faq jsonb not null default '[]'::jsonb,
  is_enriched boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint providers_slug_nonempty check (btrim(slug) <> '')
);

create unique index if not exists providers_slug_unique on public.providers (slug);

comment on table public.providers is 'Scholarship organizations; AI copy cached in ai_* columns.';

create or replace function public.providers_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists providers_set_updated_at on public.providers;
create trigger providers_set_updated_at
  before update on public.providers
  for each row
  execute function public.providers_set_updated_at();

-- Aggregated counts for hub cards and hero stats (avoids shipping large scholarship lists for counts).
create or replace view public.provider_scholarship_stats as
select
  s.provider_slug as slug,
  max(s.provider_name) filter (where s.provider_name is not null and btrim(s.provider_name) <> '') as display_name,
  count(*)::integer as scholarship_count
from public.scholarships s
where
  s.is_active = true
  and s.provider_slug is not null
  and btrim(s.provider_slug) <> ''
group by s.provider_slug;

comment on view public.provider_scholarship_stats is 'Per-provider active scholarship counts for listing and similar-provider blocks.';

alter table public.providers enable row level security;

drop policy if exists "Public read providers" on public.providers;
create policy "Public read providers"
  on public.providers
  for select
  to anon, authenticated
  using (true);

grant select on public.providers to anon, authenticated;
grant select on public.provider_scholarship_stats to anon, authenticated;
