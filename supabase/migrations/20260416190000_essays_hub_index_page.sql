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
  ranked_all as (
    select
      ma.*,
      row_number() over (
        order by
          ma.hero_priority desc,
          case when p.sort_oldest then ma.created_at end asc nulls last,
          case when not p.sort_oldest then ma.created_at end desc nulls last,
          ma.id::text asc
      ) as ord
    from matched_all ma
    cross join params p
  ),
  first_window as (
    select ra.*
    from ranked_all ra
    where ra.ord <= 36
  ),
  deduped_window as (
    select
      x.id,
      x.slug,
      x.title,
      x.hero_image_url,
      x.hero_is_real,
      x.meta_description,
      x.created_at,
      x.linked_slug,
      x.linked_label,
      x.hero_priority,
      x.cat_key,
      x.search_blob,
      x.ord
    from (
      select
        fw.*,
        case
          when nullif(trim(coalesce(fw.hero_image_url, '')), '') is null then 1
          else row_number() over (
            partition by lower(trim(fw.hero_image_url))
            order by fw.ord asc
          )
        end as hero_dedup_rank
      from first_window fw
    ) x
    where x.hero_dedup_rank = 1
  ),
  used_dedup_heroes as (
    select distinct lower(trim(dw.hero_image_url)) as hero_key
    from deduped_window dw
    where nullif(trim(coalesce(dw.hero_image_url, '')), '') is not null
  ),
  refill_window as (
    select
      ra.*
    from ranked_all ra
    where ra.ord > 36
      and (
        nullif(trim(coalesce(ra.hero_image_url, '')), '') is null
        or not exists (
          select 1
          from used_dedup_heroes uh
          where uh.hero_key = lower(trim(ra.hero_image_url))
        )
      )
  ),
  first_three_window as (
    select
      y.id,
      y.slug,
      y.title,
      y.hero_image_url,
      y.hero_is_real,
      y.meta_description,
      y.created_at,
      y.linked_slug,
      y.linked_label,
      y.hero_priority,
      y.cat_key,
      y.search_blob,
      y.ord,
      y.win_pos
    from (
      select
        c.id,
        c.slug,
        c.title,
        c.hero_image_url,
        c.hero_is_real,
        c.meta_description,
        c.created_at,
        c.linked_slug,
        c.linked_label,
        c.hero_priority,
        c.cat_key,
        c.search_blob,
        c.ord,
        row_number() over (
          order by c.pick_phase asc, c.ord asc
        ) as win_pos
      from (
        select
          dw.id,
          dw.slug,
          dw.title,
          dw.hero_image_url,
          dw.hero_is_real,
          dw.meta_description,
          dw.created_at,
          dw.linked_slug,
          dw.linked_label,
          dw.hero_priority,
          dw.cat_key,
          dw.search_blob,
          dw.ord,
          1 as pick_phase
        from deduped_window dw
        union all
        select
          rw.id,
          rw.slug,
          rw.title,
          rw.hero_image_url,
          rw.hero_is_real,
          rw.meta_description,
          rw.created_at,
          rw.linked_slug,
          rw.linked_label,
          rw.hero_priority,
          rw.cat_key,
          rw.search_blob,
          rw.ord,
          2 as pick_phase
        from refill_window rw
      ) c
    ) y
    where y.win_pos <= 36
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
  page_rows_dedup as (
    select fw.*
    from first_three_window fw
    cross join params p
    where p.sort_oldest = false
      and p.page_num <= 3
      and fw.win_pos > ((p.page_num - 1) * p.page_lim)
      and fw.win_pos <= (p.page_num * p.page_lim)
    order by fw.win_pos asc
  ),
  selected_page_rows as (
    select
      pr.id,
      pr.slug,
      pr.title,
      pr.hero_image_url,
      pr.hero_is_real,
      pr.meta_description,
      pr.created_at,
      pr.linked_slug,
      pr.linked_label,
      pr.hero_priority
    from page_rows pr
    cross join params p
    where not (p.sort_oldest = false and p.page_num <= 3)
    union all
    select
      pdr.id,
      pdr.slug,
      pdr.title,
      pdr.hero_image_url,
      pdr.hero_is_real,
      pdr.meta_description,
      pdr.created_at,
      pdr.linked_slug,
      pdr.linked_label,
      pdr.hero_priority
    from page_rows_dedup pdr
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
            'id', prx.id,
            'slug', prx.slug,
            'title', prx.title,
            'hero_image_url', prx.hero_image_url,
            'hero_is_real', prx.hero_is_real,
            'meta_description', prx.meta_description,
            'created_at', prx.created_at,
            'linked_category_slug', prx.linked_slug,
            'linked_category_label', prx.linked_label,
            'hero_list_priority', prx.hero_priority
          )
          order by
            prx.hero_priority desc,
            case when p.sort_oldest then prx.created_at end asc nulls last,
            case when not p.sort_oldest then prx.created_at end desc nulls last,
            prx.id::text asc
        )
        from selected_page_rows prx
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
