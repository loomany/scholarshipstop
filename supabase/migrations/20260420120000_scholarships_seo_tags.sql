-- Canonical SEO tags for structured listing (Phase A: column + index only; backfill separate).
-- Application vocabulary: lib/scholarships/seoTags/vocabulary.ts

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS seo_tags text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.scholarships.seo_tags IS
  'Canonical SEO tag tokens (snake_case) for route-aligned filters; see lib/scholarships/seoTags/vocabulary.ts';

-- GIN supports @> (contains), && (overlap) for array queries.
CREATE INDEX IF NOT EXISTS scholarships_seo_tags_gin
  ON public.scholarships USING GIN (seo_tags);
