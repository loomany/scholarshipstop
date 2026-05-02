-- One-off: avoid full-catalog match timeout when related_scholarships is empty.
-- Run in Supabase SQL Editor. Replace slug/title triples with real catalog rows.

-- 1) Inspect current row
select id, slug, related_scholarships, jsonb_array_length(coalesce(related_scholarships, '[]'::jsonb)) as related_count
from public.content_posts
where slug = 'keep-scholarship-usa-working-on-campus';

-- 2) Optional: grab three example slugs (edit LIMIT / filters)
-- select slug, title from public.scholarships_safe_listing
-- where coalesce(is_indexable, true) and slug is not null and btrim(slug) <> ''
-- order by random() limit 3;

-- 3) Apply manual related cards (required shape: slug + title per parseRelatedScholarshipsJson)
update public.content_posts
set
  related_scholarships = jsonb_build_array(
    jsonb_build_object(
      'slug', 'EDIT_SLUG_1',
      'title', 'EDIT_TITLE_1',
      'score', 0,
      'reason', 'Editorial: related to maintaining scholarship eligibility'
    ),
    jsonb_build_object(
      'slug', 'EDIT_SLUG_2',
      'title', 'EDIT_TITLE_2',
      'score', 0,
      'reason', 'Editorial: related to maintaining scholarship eligibility'
    ),
    jsonb_build_object(
      'slug', 'EDIT_SLUG_3',
      'title', 'EDIT_TITLE_3',
      'score', 0,
      'reason', 'Editorial: related to maintaining scholarship eligibility'
    )
  ),
  updated_at = now()
where slug = 'keep-scholarship-usa-working-on-campus'
  and status = 'published';
