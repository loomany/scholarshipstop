-- Canonical category slug for filtering (matches URL /scholarships/category/[slug]).
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS category_slug text;

UPDATE public.scholarships s
SET category_slug = CASE
  WHEN lower(trim(s.category)) IN ('misc', 'other') THEN 'miscellaneous'
  WHEN s.category IS NOT NULL AND trim(s.category) <> '' THEN lower(trim(s.category))
  ELSE s.category_slug
END
WHERE s.category_slug IS NULL;

CREATE INDEX IF NOT EXISTS scholarships_category_slug_active_idx
  ON public.scholarships (category_slug)
  WHERE is_active = true;
