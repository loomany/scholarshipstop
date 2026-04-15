-- Essay Hub /essays index: single-query pagination + category aggregates (replaces N+1 batched fetches).

create extension if not exists unaccent with schema extensions;

-- Mirrors JS `normalizeForMatch` in `lib/essays/essaysIndexFilters.ts` closely (NFKD + strip accents via unaccent).
create or replace function public.essay_index_normalize(p_input text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select trim(
    regexp_replace(
      lower(extensions.unaccent(coalesce(p_input, ''))),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

comment on function public.essay_index_normalize(text) is
  'Normalized text for essay hub keyword search (aligned with essaysIndexFilters.normalizeForMatch).';

-- First linked scholarship per essay: min(scholarship_id) among scholarship_essays (matches essaysServer.pickFirstCategoryPerEssay).
create or replace function public.essays_hub_index_page(
  p_q text default '',
  p_category text default null,
  p_sort text default 'latest',
  p_page int default 1,
  p_page_size int default 12
)
returns jsonb
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with
  params as (
    select
      trim(public.essay_index_normalize(coalesce(p_q, ''))) as needle,
      nullif(trim(coalesce(p_category, '')), '') as filter_cat,
      lower(trim(coalesce(p_sort, ''))) = 'oldest' as sort_oldest,
      greatest(coalesce(p_page, 1), 1) as page_num,
      greatest(coalesce(p_page_size, 12), 1) as page_lim
  ),
  base as (
    select
      e.id,
      e.slug,
      e.title,
      e.hero_image_url,
      e.hero_is_real,
      e.meta_description,
      e.created_at,
      nullif(trim(fc.category_slug), '') as linked_slug,
      nullif(trim(fc.category), '') as linked_label,
      case when e.hero_is_real then 1 else 0 end as hero_priority,
      case
        when nullif(trim(fc.category_slug), '') is null then 'uncategorized'::text
        else trim(fc.category_slug)
      end as cat_key,
      public.essay_index_normalize(
        concat_ws(
          ' ',
          e.slug,
          e.title,
          e.meta_description,
          fc.category,
          fc.category_slug
        )
      ) as search_blob
    from public.essays e
    left join lateral (
      select s.category_slug, s.category
      from public.scholarship_essays se
      inner join public.scholarships s on s.id = se.scholarship_id
      where se.essay_id = e.id
      order by se.scholarship_id asc
      limit 1
    ) fc on true
    where e.is_published = true
      and btrim(e.slug) <> ''
  ),
  matched_q as (
    select b.*
    from base b
    cross join params p
    where p.needle = '' or position(p.needle in b.search_blob) > 0
  ),
  matched_all as (
    select mq.*
    from matched_q mq
    cross join params p
    where p.filter_cat is null or mq.cat_key = p.filter_cat
  ),
  category_agg as (
    select
      mq.cat_key,
      case
        when mq.cat_key = 'uncategorized' then 'Uncategorized'::text
        else coalesce(
          max(mq.linked_label),
          initcap(replace(mq.cat_key, '-'::text, ' '::text))
        )
      end as label,
      count(*)::int as cnt
    from matched_q mq
    group by mq.cat_key
  ),
  page_rows as (
    select m.*
    from matched_all m
    cross join params p
    order by
      m.hero_priority desc,
      case when p.sort_oldest then m.created_at end asc nulls last,
      case when not p.sort_oldest then m.created_at end desc nulls last,
      m.id::text asc
    limit (select page_lim from params)
    offset (select (page_num - 1) * page_lim from params)
  ),
  total_ct as (
    select count(*)::bigint as c from matched_all
  )
  select jsonb_build_object(
    'any_published',
    (
      select exists (
        select 1
        from public.essays e
        where e.is_published = true
          and btrim(e.slug) <> ''
      )
    ),
    'total', (select c from total_ct),
    'rows',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', pr.id,
            'slug', pr.slug,
            'title', pr.title,
            'hero_image_url', pr.hero_image_url,
            'hero_is_real', pr.hero_is_real,
            'meta_description', pr.meta_description,
            'created_at', pr.created_at,
            'linked_category_slug', pr.linked_slug,
            'linked_category_label', pr.linked_label,
            'hero_list_priority', pr.hero_priority
          )
          order by
            pr.hero_priority desc,
            case when p.sort_oldest then pr.created_at end asc nulls last,
            case when not p.sort_oldest then pr.created_at end desc nulls last,
            pr.id::text asc
        )
        from page_rows pr
        cross join params p
      ),
      '[]'::jsonb
    ),
    'category_options',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'key', ca.cat_key,
            'label', ca.label,
            'count', ca.cnt
          )
          order by lower(ca.label)
        )
        from category_agg ca
      ),
      '[]'::jsonb
    )
  );
$$;

comment on function public.essays_hub_index_page(text, text, text, int, int) is
  'Paginated /essays hub: search, category, sort, totals, and category facet counts in one round-trip.';

grant execute on function public.essay_index_normalize(text) to anon, authenticated, service_role;
grant execute on function public.essays_hub_index_page(text, text, text, int, int) to anon, authenticated, service_role;
