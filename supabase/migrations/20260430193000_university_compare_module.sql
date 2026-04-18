-- University Comparison (versus pages): institutions, compare_pages, scholarships.institution_id, RPCs.

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  city text,
  state text,
  country text,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists institutions_state_idx on public.institutions (state);

create or replace function public.institutions_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists institutions_set_updated_at on public.institutions;
create trigger institutions_set_updated_at
  before update on public.institutions
  for each row
  execute function public.institutions_set_updated_at();

comment on table public.institutions is
  'Universities / colleges for versus comparison pages; may be bootstrapped from providers.slug.';

alter table public.institutions enable row level security;

drop policy if exists institutions_select_public on public.institutions;
create policy institutions_select_public
  on public.institutions
  for select
  to anon, authenticated
  using (true);

insert into public.institutions (name, slug, state, website_url)
select p.display_name, p.slug, p.state, p.official_url
from public.providers p
where not exists (
  select 1 from public.institutions i where i.slug = p.slug
);

alter table public.scholarships
  add column if not exists institution_id uuid references public.institutions (id) on delete set null;

create index if not exists scholarships_institution_id_idx
  on public.scholarships (institution_id)
  where institution_id is not null;

comment on column public.scholarships.institution_id is
  'FK to institutions; backfilled from provider_slug matching institutions.slug.';

update public.scholarships s
set institution_id = inst.id
from public.institutions inst
where s.provider_slug is not null
  and inst.slug = s.provider_slug
  and s.institution_id is null;

create table if not exists public.compare_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  inst_a_id uuid not null references public.institutions (id) on delete restrict,
  inst_b_id uuid not null references public.institutions (id) on delete restrict,
  content_json jsonb not null default '{}'::jsonb,
  ai_verdict text,
  meta_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'draft'
    constraint compare_pages_status_check
      check (status in ('draft', 'published', 'archived')),
  constraint compare_pages_distinct_institutions check (inst_a_id <> inst_b_id)
);

create or replace function public.compare_pages_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists compare_pages_set_updated_at on public.compare_pages;
create trigger compare_pages_set_updated_at
  before update on public.compare_pages
  for each row
  execute function public.compare_pages_set_updated_at();

create unique index if not exists compare_pages_pair_uidx
  on public.compare_pages (
    least(inst_a_id, inst_b_id),
    greatest(inst_a_id, inst_b_id)
  );

create index if not exists compare_pages_inst_a_id_idx
  on public.compare_pages (inst_a_id);

create index if not exists compare_pages_inst_b_id_idx
  on public.compare_pages (inst_b_id);

comment on table public.compare_pages is
  'Published university vs pages; slug is alphabetically ordered institution slugs: a-vs-b.';

alter table public.compare_pages enable row level security;

drop policy if exists compare_pages_select_published on public.compare_pages;
create policy compare_pages_select_published
  on public.compare_pages
  for select
  to anon, authenticated
  using (status = 'published');

-- Per-institution numeric / categorical aggregates (no institution identity here).
create or replace function public.comparison_metrics_bundle(p_inst uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select *
    from public.scholarships
    where institution_id = p_inst
      and coalesce(is_active, true)
  ),
  tall as (
    select
      count(*)::int as grant_count,
      max(greatest(coalesce(award_amount_max, 0), coalesce(award_amount_numeric_sort, 0))) as max_amount,
      count(*) filter (
        where deadline_date is not null
          and deadline_date >= (current_timestamp at time zone 'utc')::date
      ) as open_grants,
      avg(credibility_score) filter (where credibility_score is not null) as avg_credibility,
      count(*) filter (where essay_required or requires_essay) as essay_grant_count,
      count(*) filter (where financial_need_considered = true) as need_n,
      count(*) filter (where coalesce(financial_need_considered, false) = false) as merit_n
    from base
  )
  select jsonb_build_object(
    'grant_count', coalesce((select grant_count from tall), 0),
    'avg_amount', (
      select avg(v)::numeric
      from (
        select coalesce(nullif(award_amount_max, 0), nullif(award_amount_numeric_sort, 0)) as v
        from base
      ) x
      where v is not null
    ),
    'max_amount', (select max_amount from tall),
    'merit_pct', case
      when coalesce((select merit_n + need_n from tall), 0) = 0 then null::numeric
      else round(
        100.0 * (select merit_n from tall)::numeric
          / nullif((select merit_n + need_n from tall), 0),
        1
      )
    end,
    'need_pct', case
      when coalesce((select merit_n + need_n from tall), 0) = 0 then null::numeric
      else round(
        100.0 * (select need_n from tall)::numeric
          / nullif((select merit_n + need_n from tall), 0),
        1
      )
    end,
    'open_grants', coalesce((select open_grants from tall), 0),
    'avg_credibility', (select avg_credibility from tall),
    'essay_grant_count', coalesce((select essay_grant_count from tall), 0)
  );
$$;

grant execute on function public.comparison_metrics_bundle(uuid) to anon, authenticated;

create or replace function public.get_comparison_data(p_inst_a uuid, p_inst_b uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with inst_a as (
    select i.id, i.slug, i.name
    from public.institutions i
    where i.id = p_inst_a
  ),
  inst_b as (
    select i.id, i.slug, i.name
    from public.institutions i
    where i.id = p_inst_b
  ),
  themes_a as (
    select coalesce(jsonb_agg(to_jsonb(q.t) order by q.t), '[]'::jsonb) as value
    from (
      select distinct trim(e.title) as t
      from public.scholarships s
      join public.scholarship_essays se on se.scholarship_id = s.id
      join public.essays e on e.id = se.essay_id
      where s.institution_id = p_inst_a
        and coalesce(s.is_active, true)
        and e.title is not null
        and trim(e.title) <> ''
      limit 25
    ) q
  ),
  themes_b as (
    select coalesce(jsonb_agg(to_jsonb(q.t) order by q.t), '[]'::jsonb) as value
    from (
      select distinct trim(e.title) as t
      from public.scholarships s
      join public.scholarship_essays se on se.scholarship_id = s.id
      join public.essays e on e.id = se.essay_id
      where s.institution_id = p_inst_b
        and coalesce(s.is_active, true)
        and e.title is not null
        and trim(e.title) <> ''
      limit 25
    ) q
  ),
  fos_a as (
    select coalesce(jsonb_agg(to_jsonb(q.f) order by q.f), '[]'::jsonb) as value
    from (
      select distinct trim(x.fos) as f
      from public.scholarships s,
        lateral jsonb_array_elements_text(coalesce(s.field_of_study, '[]'::jsonb)) as x(fos)
      where s.institution_id = p_inst_a
        and coalesce(s.is_active, true)
        and (s.essay_required or s.requires_essay)
        and trim(x.fos) <> ''
      limit 40
    ) q
  ),
  fos_b as (
    select coalesce(jsonb_agg(to_jsonb(q.f) order by q.f), '[]'::jsonb) as value
    from (
      select distinct trim(x.fos) as f
      from public.scholarships s,
        lateral jsonb_array_elements_text(coalesce(s.field_of_study, '[]'::jsonb)) as x(fos)
      where s.institution_id = p_inst_b
        and coalesce(s.is_active, true)
        and (s.essay_required or s.requires_essay)
        and trim(x.fos) <> ''
      limit 40
    ) q
  ),
  part_a as (
    select
      jsonb_build_object('id', ia.id, 'slug', ia.slug, 'name', ia.name)
      || public.comparison_metrics_bundle(p_inst_a)
      || jsonb_build_object(
        'essay_themes_from_links', ta.value,
        'essay_field_themes', fa.value
      ) as value
    from inst_a ia
    cross join themes_a ta
    cross join fos_a fa
  ),
  part_b as (
    select
      jsonb_build_object('id', ib.id, 'slug', ib.slug, 'name', ib.name)
      || public.comparison_metrics_bundle(p_inst_b)
      || jsonb_build_object(
        'essay_themes_from_links', tb.value,
        'essay_field_themes', fb.value
      ) as value
    from inst_b ib
    cross join themes_b tb
    cross join fos_b fb
  )
  select case
    when not exists (select 1 from inst_a) or not exists (select 1 from inst_b) then
      jsonb_build_object('error', 'institution_not_found')
    else
      jsonb_build_object(
        'institution_a', (select value from part_a),
        'institution_b', (select value from part_b)
      )
  end;
$$;

comment on function public.get_comparison_data(uuid, uuid) is
  'Aggregates catalog metrics for two institutions (amounts, merit/need mix, essay themes).';

grant execute on function public.get_comparison_data(uuid, uuid) to anon, authenticated;

create or replace function public.compare_pages_sitemap_rows()
returns table (slug text, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select cp.slug, cp.updated_at
  from public.compare_pages cp
  where cp.status = 'published';
$$;

comment on function public.compare_pages_sitemap_rows() is
  'Public-safe list of published compare page slugs for XML sitemap.';

grant execute on function public.compare_pages_sitemap_rows() to anon, authenticated;

create or replace function public.get_compare_peer_institutions(
  p_institution_id uuid,
  p_limit int default 3
)
returns table (
  peer_id uuid,
  peer_slug text,
  peer_name text,
  compare_slug text,
  peer_grant_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with counts as (
    select s.institution_id as iid, count(*)::bigint as c
    from public.scholarships s
    where coalesce(s.is_active, true)
      and s.institution_id is not null
    group by s.institution_id
  ),
  anchor as (
    select anc.id, anc.slug, anc.state
    from public.institutions anc
    where anc.id = p_institution_id
  )
  select
    peer.id as peer_id,
    peer.slug as peer_slug,
    peer.name as peer_name,
    case
      when peer.slug < anchor.slug then peer.slug || '-vs-' || anchor.slug
      else anchor.slug || '-vs-' || peer.slug
    end as compare_slug,
    coalesce(c.c, 0::bigint) as peer_grant_count
  from public.institutions peer
  cross join anchor
  left join counts c on c.iid = peer.id
  where peer.id <> p_institution_id
    and coalesce(c.c, 0) >= 1
  order by
    case
      when anchor.state is not null
        and peer.state is not null
        and peer.state = anchor.state
      then 0
      else 1
    end,
    coalesce(c.c, 0) desc,
    peer.slug asc
  limit coalesce(nullif(p_limit, 0), 3);
$$;

comment on function public.get_compare_peer_institutions(uuid, int) is
  'Other institutions with scholarships, prioritizing same state; yields canonical compare_slug for links.';

grant execute on function public.get_compare_peer_institutions(uuid, int) to anon, authenticated;
