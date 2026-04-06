-- Subject catalog taxonomy (L1/L2) + M:N link to scholarships.
-- Facets (audience, academic level, requirements, amount, location) stay in seo_tags text[]
-- and existing SEO routing — not duplicated here.
-- See: docs/subject-taxonomy-and-facets.md, data/scholarship-subject-category-map.json

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  label text NOT NULL,
  level smallint NOT NULL CHECK (level IN (1, 2)),
  parent_id uuid REFERENCES public.categories (id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_slug_unique UNIQUE (slug),
  CONSTRAINT categories_level_parent_chk CHECK (
    (level = 1 AND parent_id IS NULL)
    OR (level = 2 AND parent_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.categories IS
  'Browse taxonomy: L1 top-level subject areas, L2 subcategories. Facets use scholarships.seo_tags.';

CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON public.categories (parent_id);
CREATE INDEX IF NOT EXISTS categories_level_active_idx ON public.categories (level, is_active);

CREATE TABLE IF NOT EXISTS public.scholarship_categories (
  scholarship_id uuid NOT NULL REFERENCES public.scholarships (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories (id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scholarship_categories_pkey PRIMARY KEY (scholarship_id, category_id)
);

COMMENT ON TABLE public.scholarship_categories IS
  'M:N subject categories (L2 rows only in practice). Backfill: scripts/backfill-scholarship-subject-categories.ts';

COMMENT ON COLUMN public.scholarship_categories.is_primary IS
  'One primary L2 per scholarship recommended (backfill sets first match).';

COMMENT ON COLUMN public.scholarship_categories.source IS
  'e.g. field_of_study, keyword, seo_subject_tag, legacy_category_slug, fallback';

CREATE INDEX IF NOT EXISTS scholarship_categories_category_id_idx
  ON public.scholarship_categories (category_id);

CREATE INDEX IF NOT EXISTS scholarship_categories_scholarship_id_idx
  ON public.scholarship_categories (scholarship_id);

-- ─── Seed L1 ───
INSERT INTO public.categories (slug, label, level, parent_id, sort_order) VALUES
  ('stem', 'STEM', 1, NULL, 10),
  ('health_medicine', 'Health & medicine', 1, NULL, 20),
  ('business', 'Business & economics', 1, NULL, 30),
  ('law_public_affairs', 'Law & public affairs', 1, NULL, 40),
  ('education', 'Education & teaching', 1, NULL, 50),
  ('arts_media_design', 'Arts, media & design', 1, NULL, 60),
  ('humanities_social_sciences', 'Humanities & social sciences', 1, NULL, 70),
  ('agriculture_environment', 'Agriculture & environment', 1, NULL, 80),
  ('trades_technical', 'Trades & technical education', 1, NULL, 90),
  ('community_service', 'Community & service', 1, NULL, 100),
  ('public_safety_service', 'Public safety & protective services', 1, NULL, 110),
  ('leisure_lifestyle', 'Sports, hobbies & lifestyle', 1, NULL, 120),
  ('general', 'General & interdisciplinary', 1, NULL, 130)
ON CONFLICT (slug) DO NOTHING;

-- ─── Seed L2 (parent resolved by slug) ───
INSERT INTO public.categories (slug, label, level, parent_id, sort_order)
SELECT v.slug, v.label, 2, p.id, v.ord
FROM (VALUES
  ('engineering', 'Engineering', 'stem', 10),
  ('computer_science', 'Computer science', 'stem', 20),
  ('stem_general', 'STEM (general)', 'stem', 30),
  ('medicine', 'Medicine & pre-med', 'health_medicine', 10),
  ('nursing_allied_health', 'Nursing & allied health', 'health_medicine', 20),
  ('biology_life_sciences', 'Biology & life sciences', 'health_medicine', 30),
  ('public_health', 'Public health', 'health_medicine', 40),
  ('business_general', 'Business', 'business', 10),
  ('finance_economics', 'Finance & economics', 'business', 20),
  ('law_pre_law', 'Law & pre-law', 'law_public_affairs', 10),
  ('public_policy_government', 'Public policy & government', 'law_public_affairs', 20),
  ('education_k12_higher', 'Education programs', 'education', 10),
  ('visual_arts', 'Visual arts', 'arts_media_design', 10),
  ('performing_arts_music', 'Performing arts & music', 'arts_media_design', 20),
  ('media_design_communication', 'Media, design & communication', 'arts_media_design', 30),
  ('humanities', 'Humanities', 'humanities_social_sciences', 10),
  ('social_sciences', 'Social sciences', 'humanities_social_sciences', 20),
  ('agriculture_food', 'Agriculture & food systems', 'agriculture_environment', 10),
  ('environment_sustainability', 'Environment & sustainability', 'agriculture_environment', 20),
  ('skilled_trades', 'Skilled trades', 'trades_technical', 10),
  ('technical_vocational', 'Technical & vocational', 'trades_technical', 20),
  ('community_nonprofit', 'Community & nonprofit', 'community_service', 10),
  ('protective_services', 'Protective & emergency services', 'public_safety_service', 10),
  ('sports_recreation', 'Sports & recreation', 'leisure_lifestyle', 10),
  ('hobbies_personal', 'Hobbies & personal interest', 'leisure_lifestyle', 20),
  ('interdisciplinary', 'Interdisciplinary', 'general', 10),
  ('open_subject', 'General / open subject', 'general', 20)
) AS v(slug, label, parent_slug, ord)
JOIN public.categories p ON p.slug = v.parent_slug AND p.level = 1
ON CONFLICT (slug) DO NOTHING;
