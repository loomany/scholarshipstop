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
      nullif(trim(coalesce(e.hub_category_slug, fc.category_slug)), '') as linked_slug,
      nullif(trim(coalesce(e.hub_category_label, fc.category)), '') as linked_label,
      e.hub_distribution_group,
      e.hub_distribution_rank,
      case when e.hero_is_real then 1 else 0 end as hero_priority,
      case
        when nullif(trim(coalesce(e.hub_category_slug, fc.category_slug)), '') is null then 'uncategorized'::text
        else trim(coalesce(e.hub_category_slug, fc.category_slug))
      end as cat_key,
      public.essay_index_normalize(
        concat_ws(
          ' ',
          e.slug,
          e.title,
          e.meta_description,
          e.hub_category_label,
          e.hub_category_slug,
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
  ranked_regular as (
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
  intl_default as (
    select
      ma.*,
      row_number() over (
        order by
          ma.hub_distribution_rank asc nulls last,
          ma.created_at desc nulls last,
          ma.id::text asc
      ) as intl_ord
    from matched_all ma
    cross join params p
    where p.filter_cat is null
      and p.needle = ''
      and p.sort_oldest = false
      and ma.cat_key = 'international-students'
      and ma.hub_distribution_group = 'international-students'
  ),
  non_intl_default as (
    select
      ma.*,
      row_number() over (
        order by
          ma.hero_priority desc,
          ma.created_at desc nulls last,
          ma.id::text asc
      ) as non_ord
    from matched_all ma
    cross join params p
    where p.filter_cat is null
      and p.needle = ''
      and p.sort_oldest = false
      and not (
        ma.cat_key = 'international-students'
        and ma.hub_distribution_group = 'international-students'
      )
  ),
  default_intl_page as (
    select
      i.id,
      i.slug,
      i.title,
      i.hero_image_url,
      i.hero_is_real,
      i.meta_description,
      i.created_at,
      i.linked_slug,
      i.linked_label,
      i.hub_distribution_group,
      i.hub_distribution_rank,
      i.hero_priority,
      i.cat_key,
      i.search_blob,
      i.intl_ord as page_sort,
      1 as page_group
    from intl_default i
    cross join params p
    where i.intl_ord > ((p.page_num - 1) * 2)
      and i.intl_ord <= (p.page_num * 2)
  ),
  default_non_intl_page as (
    select
      n.id,
      n.slug,
      n.title,
      n.hero_image_url,
      n.hero_is_real,
      n.meta_description,
      n.created_at,
      n.linked_slug,
      n.linked_label,
      n.hub_distribution_group,
      n.hub_distribution_rank,
      n.hero_priority,
      n.cat_key,
      n.search_blob,
      n.non_ord as page_sort,
      2 as page_group
    from non_intl_default n
    cross join params p
    where n.non_ord > ((p.page_num - 1) * greatest(p.page_lim - 2, 1))
      and n.non_ord <= (p.page_num * greatest(p.page_lim - 2, 1))
  ),
  page_rows_regular as (
    select
      r.id,
      r.slug,
      r.title,
      r.hero_image_url,
      r.hero_is_real,
      r.meta_description,
      r.created_at,
      r.linked_slug,
      r.linked_label,
      r.hub_distribution_group,
      r.hub_distribution_rank,
      r.hero_priority,
      r.cat_key,
      r.search_blob,
      r.ord as page_sort,
      1 as page_group
    from ranked_regular r
    cross join params p
    where not (p.filter_cat is null and p.needle = '' and p.sort_oldest = false)
      and r.ord > ((p.page_num - 1) * p.page_lim)
      and r.ord <= (p.page_num * p.page_lim)
  ),
  selected_page_rows as (
    select * from default_intl_page
    union all
    select * from default_non_intl_page
    union all
    select * from page_rows_regular
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
          order by prx.page_group asc, prx.page_sort asc
        )
        from selected_page_rows prx
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
  'Paginated /essays hub: search, category, sort, manual category overrides, and International students interleaving.';

grant execute on function public.essays_hub_index_page(text, text, text, int, int) to anon, authenticated, service_role;
