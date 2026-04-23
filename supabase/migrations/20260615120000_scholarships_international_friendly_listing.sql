-- Precomputed flag for "International Friendly" listing filter.
-- Must stay in sync with applyMoreFilters(..., citizenshipAudience = international_friendly)
-- in lib/scholarships/scholarshipListServer.ts (legacy OR of ilike + jsonb @>).

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS international_friendly_listing boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.scholarships.international_friendly_listing IS
  'True when row matches the legacy PostgREST international_friendly OR (ilike + citizenship/eligibility jsonb).';

CREATE OR REPLACE FUNCTION public.scholarship_international_friendly_listing_from_row(
  p_title text,
  p_summary_short text,
  p_description text,
  p_requirements_text text,
  p_eligibility_text text,
  p_citizenship_statuses jsonb,
  p_eligibility_tags jsonb
) RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT (
    (p_title IS NOT NULL AND p_title ILIKE '%international student%') OR
    (p_summary_short IS NOT NULL AND p_summary_short ILIKE '%international student%') OR
    (p_title IS NOT NULL AND p_title ILIKE '%foreign student%') OR
    (p_summary_short IS NOT NULL AND p_summary_short ILIKE '%foreign student%') OR
    (p_title IS NOT NULL AND p_title ILIKE '%foreign national%') OR
    (p_summary_short IS NOT NULL AND p_summary_short ILIKE '%foreign national%') OR
    (p_title IS NOT NULL AND p_title ILIKE '%f-1%') OR
    (p_summary_short IS NOT NULL AND p_summary_short ILIKE '%f-1%') OR
    (p_description IS NOT NULL AND p_description ILIKE '%international student%') OR
    (p_description IS NOT NULL AND p_description ILIKE '%foreign student%') OR
    (p_requirements_text IS NOT NULL AND p_requirements_text ILIKE '%international student%') OR
    (p_requirements_text IS NOT NULL AND p_requirements_text ILIKE '%foreign student%') OR
    (p_eligibility_text IS NOT NULL AND p_eligibility_text ILIKE '%international student%') OR
    (p_eligibility_text IS NOT NULL AND p_eligibility_text ILIKE '%foreign student%') OR
    (COALESCE(p_citizenship_statuses, '[]'::jsonb) @> '["international"]'::jsonb) OR
    (COALESCE(p_citizenship_statuses, '[]'::jsonb) @> '["international_students"]'::jsonb) OR
    (COALESCE(p_citizenship_statuses, '[]'::jsonb) @> '["international_student"]'::jsonb) OR
    (COALESCE(p_eligibility_tags, '[]'::jsonb) @> '["international_students"]'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.scholarships_set_international_friendly_listing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.international_friendly_listing := public.scholarship_international_friendly_listing_from_row(
    NEW.title,
    NEW.summary_short,
    NEW.description,
    NEW.requirements_text,
    NEW.eligibility_text,
    COALESCE(NEW.citizenship_statuses, '[]'::jsonb),
    COALESCE(NEW.eligibility_tags, '[]'::jsonb)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scholarships_set_international_friendly_listing ON public.scholarships;
CREATE TRIGGER scholarships_set_international_friendly_listing
  BEFORE INSERT OR UPDATE OF title, summary_short, description, requirements_text, eligibility_text, citizenship_statuses, eligibility_tags
  ON public.scholarships
  FOR EACH ROW
  EXECUTE PROCEDURE public.scholarships_set_international_friendly_listing();

UPDATE public.scholarships s
SET international_friendly_listing = public.scholarship_international_friendly_listing_from_row(
  s.title,
  s.summary_short,
  s.description,
  s.requirements_text,
  s.eligibility_text,
  COALESCE(s.citizenship_statuses, '[]'::jsonb),
  COALESCE(s.eligibility_tags, '[]'::jsonb)
);

CREATE INDEX IF NOT EXISTS scholarships_international_friendly_listing_true_idx
  ON public.scholarships (international_friendly_listing)
  WHERE international_friendly_listing = true;
