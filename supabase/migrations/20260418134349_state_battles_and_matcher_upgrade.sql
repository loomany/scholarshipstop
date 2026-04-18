-- State Battles SEO module + matcher support.

create table if not exists public.states (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  code text not null unique,
  region text not null,
  description_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint states_code_check check (char_length(code) = 2)
);

create or replace function public.states_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists states_set_updated_at on public.states;
create trigger states_set_updated_at
  before update on public.states
  for each row
  execute function public.states_set_updated_at();

insert into public.states (name, slug, code, region)
values
  ('Alabama', 'alabama', 'AL', 'South'),
  ('Alaska', 'alaska', 'AK', 'West'),
  ('Arizona', 'arizona', 'AZ', 'West'),
  ('Arkansas', 'arkansas', 'AR', 'South'),
  ('California', 'california', 'CA', 'West'),
  ('Colorado', 'colorado', 'CO', 'West'),
  ('Connecticut', 'connecticut', 'CT', 'Northeast'),
  ('Delaware', 'delaware', 'DE', 'South'),
  ('District of Columbia', 'district-of-columbia', 'DC', 'South'),
  ('Florida', 'florida', 'FL', 'South'),
  ('Georgia', 'georgia', 'GA', 'South'),
  ('Hawaii', 'hawaii', 'HI', 'West'),
  ('Idaho', 'idaho', 'ID', 'West'),
  ('Illinois', 'illinois', 'IL', 'Midwest'),
  ('Indiana', 'indiana', 'IN', 'Midwest'),
  ('Iowa', 'iowa', 'IA', 'Midwest'),
  ('Kansas', 'kansas', 'KS', 'Midwest'),
  ('Kentucky', 'kentucky', 'KY', 'South'),
  ('Louisiana', 'louisiana', 'LA', 'South'),
  ('Maine', 'maine', 'ME', 'Northeast'),
  ('Maryland', 'maryland', 'MD', 'South'),
  ('Massachusetts', 'massachusetts', 'MA', 'Northeast'),
  ('Michigan', 'michigan', 'MI', 'Midwest'),
  ('Minnesota', 'minnesota', 'MN', 'Midwest'),
  ('Mississippi', 'mississippi', 'MS', 'South'),
  ('Missouri', 'missouri', 'MO', 'Midwest'),
  ('Montana', 'montana', 'MT', 'West'),
  ('Nebraska', 'nebraska', 'NE', 'Midwest'),
  ('Nevada', 'nevada', 'NV', 'West'),
  ('New Hampshire', 'new-hampshire', 'NH', 'Northeast'),
  ('New Jersey', 'new-jersey', 'NJ', 'Northeast'),
  ('New Mexico', 'new-mexico', 'NM', 'West'),
  ('New York', 'new-york', 'NY', 'Northeast'),
  ('North Carolina', 'north-carolina', 'NC', 'South'),
  ('North Dakota', 'north-dakota', 'ND', 'Midwest'),
  ('Ohio', 'ohio', 'OH', 'Midwest'),
  ('Oklahoma', 'oklahoma', 'OK', 'South'),
  ('Oregon', 'oregon', 'OR', 'West'),
  ('Pennsylvania', 'pennsylvania', 'PA', 'Northeast'),
  ('Rhode Island', 'rhode-island', 'RI', 'Northeast'),
  ('South Carolina', 'south-carolina', 'SC', 'South'),
  ('South Dakota', 'south-dakota', 'SD', 'Midwest'),
  ('Tennessee', 'tennessee', 'TN', 'South'),
  ('Texas', 'texas', 'TX', 'South'),
  ('Utah', 'utah', 'UT', 'West'),
  ('Vermont', 'vermont', 'VT', 'Northeast'),
  ('Virginia', 'virginia', 'VA', 'South'),
  ('Washington', 'washington', 'WA', 'West'),
  ('West Virginia', 'west-virginia', 'WV', 'South'),
  ('Wisconsin', 'wisconsin', 'WI', 'Midwest'),
  ('Wyoming', 'wyoming', 'WY', 'West')
on conflict (code) do update
set
  name = excluded.name,
  slug = excluded.slug,
  region = excluded.region;

comment on table public.states is
  'Seeded USPS state reference table for state-vs-state SEO pages and geo-aware matcher fallbacks.';

alter table public.states enable row level security;

drop policy if exists states_select_public on public.states;
create policy states_select_public
  on public.states
  for select
  to anon, authenticated
  using (true);

create table if not exists public.state_compare_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  state_a_code text not null references public.states (code) on delete restrict,
  state_b_code text not null references public.states (code) on delete restrict,
  content_json jsonb not null default '{}'::jsonb,
  ai_verdict text,
  meta_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'draft'
    constraint state_compare_pages_status_check
      check (status in ('draft', 'published', 'archived')),
  constraint state_compare_pages_distinct_states check (state_a_code <> state_b_code)
);

create or replace function public.state_compare_pages_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists state_compare_pages_set_updated_at on public.state_compare_pages;
create trigger state_compare_pages_set_updated_at
  before update on public.state_compare_pages
  for each row
  execute function public.state_compare_pages_set_updated_at();

create unique index if not exists state_compare_pages_pair_uidx
  on public.state_compare_pages (
    least(state_a_code, state_b_code),
    greatest(state_a_code, state_b_code)
  );

create index if not exists state_compare_pages_state_a_code_idx
  on public.state_compare_pages (state_a_code);

create index if not exists state_compare_pages_state_b_code_idx
  on public.state_compare_pages (state_b_code);

comment on table public.state_compare_pages is
  'Published state-vs-state pages; slug is alphabetically ordered state slugs: a-vs-b.';

alter table public.state_compare_pages enable row level security;

drop policy if exists state_compare_pages_select_published on public.state_compare_pages;
create policy state_compare_pages_select_published
  on public.state_compare_pages
  for select
  to anon, authenticated
  using (status = 'published');

create or replace function public.get_state_comparison_data(
  p_state_a_code text,
  p_state_b_code text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with state_a as (
    select s.id, s.name, s.slug, upper(s.code) as code, s.region, s.description_json
    from public.states s
    where upper(s.code) = upper(trim(p_state_a_code))
  ),
  state_b as (
    select s.id, s.name, s.slug, upper(s.code) as code, s.region, s.description_json
    from public.states s
    where upper(s.code) = upper(trim(p_state_b_code))
  ),
  metrics_a as (
    select
      count(*)::int as grant_count,
      avg(q.amount)::numeric as avg_amount,
      max(q.amount) as max_amount
    from (
      select coalesce(nullif(s.award_amount_max, 0), nullif(s.award_amount_numeric_sort, 0)) as amount
      from public.scholarships s
      where coalesce(s.is_active, true)
        and exists (
          select 1
          from jsonb_array_elements_text(coalesce(s.state_codes, '[]'::jsonb)) as sc(code)
          where upper(trim(sc.code)) = (select code from state_a)
        )
    ) q
  ),
  metrics_b as (
    select
      count(*)::int as grant_count,
      avg(q.amount)::numeric as avg_amount,
      max(q.amount) as max_amount
    from (
      select coalesce(nullif(s.award_amount_max, 0), nullif(s.award_amount_numeric_sort, 0)) as amount
      from public.scholarships s
      where coalesce(s.is_active, true)
        and exists (
          select 1
          from jsonb_array_elements_text(coalesce(s.state_codes, '[]'::jsonb)) as sc(code)
          where upper(trim(sc.code)) = (select code from state_b)
        )
    ) q
  ),
  top_universities_a as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'slug', q.slug,
          'name', q.name,
          'grant_count', q.grant_count
        )
        order by q.grant_count desc, q.name asc
      ),
      '[]'::jsonb
    ) as value
    from (
      select i.id, i.slug, i.name, count(*)::int as grant_count
      from public.institutions i
      join public.scholarships s on s.institution_id = i.id
      where upper(trim(coalesce(i.state, ''))) = (select code from state_a)
        and coalesce(s.is_active, true)
      group by i.id, i.slug, i.name
      order by count(*) desc, i.name asc
      limit 5
    ) q
  ),
  top_universities_b as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'slug', q.slug,
          'name', q.name,
          'grant_count', q.grant_count
        )
        order by q.grant_count desc, q.name asc
      ),
      '[]'::jsonb
    ) as value
    from (
      select i.id, i.slug, i.name, count(*)::int as grant_count
      from public.institutions i
      join public.scholarships s on s.institution_id = i.id
      where upper(trim(coalesce(i.state, ''))) = (select code from state_b)
        and coalesce(s.is_active, true)
      group by i.id, i.slug, i.name
      order by count(*) desc, i.name asc
      limit 5
    ) q
  )
  select case
    when not exists (select 1 from state_a) or not exists (select 1 from state_b) then
      jsonb_build_object('error', 'state_not_found')
    else
      jsonb_build_object(
        'state_a',
        (
          select jsonb_build_object(
            'id', sa.id,
            'name', sa.name,
            'slug', sa.slug,
            'code', sa.code,
            'region', sa.region,
            'description_json', sa.description_json,
            'grant_count', coalesce(ma.grant_count, 0),
            'avg_amount', ma.avg_amount,
            'max_amount', ma.max_amount,
            'top_universities', tua.value
          )
          from state_a sa
          cross join metrics_a ma
          cross join top_universities_a tua
        ),
        'state_b',
        (
          select jsonb_build_object(
            'id', sb.id,
            'name', sb.name,
            'slug', sb.slug,
            'code', sb.code,
            'region', sb.region,
            'description_json', sb.description_json,
            'grant_count', coalesce(mb.grant_count, 0),
            'avg_amount', mb.avg_amount,
            'max_amount', mb.max_amount,
            'top_universities', tub.value
          )
          from state_b sb
          cross join metrics_b mb
          cross join top_universities_b tub
        )
      )
  end;
$$;

comment on function public.get_state_comparison_data(text, text) is
  'Aggregates scholarship climate metrics for two states: grant count, award size, and top universities.';

grant execute on function public.get_state_comparison_data(text, text) to anon, authenticated;

create or replace function public.state_compare_pages_sitemap_rows()
returns table (slug text, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select scp.slug, scp.updated_at
  from public.state_compare_pages scp
  where scp.status = 'published';
$$;

comment on function public.state_compare_pages_sitemap_rows() is
  'Public-safe list of published state compare page slugs for XML sitemap.';

grant execute on function public.state_compare_pages_sitemap_rows() to anon, authenticated;
