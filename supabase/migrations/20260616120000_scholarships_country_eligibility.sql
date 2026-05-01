-- Structured country eligibility for country discovery filters.
-- applicant_country_codes: who the scholarship is for (citizenship/residency/home country).
-- host_country_codes: where the scholarship/study opportunity is hosted.

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS applicant_country_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS host_country_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS country_eligibility_notes jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.scholarships.applicant_country_codes IS
  'ISO-3166 alpha-2 country codes for applicant citizenship/residency/home-country eligibility.';

COMMENT ON COLUMN public.scholarships.host_country_codes IS
  'ISO-3166 alpha-2 country codes where the scholarship/study opportunity is hosted.';

COMMENT ON COLUMN public.scholarships.country_eligibility_notes IS
  'Parser diagnostics for country eligibility backfills, kept as short reason strings.';

CREATE INDEX IF NOT EXISTS scholarships_applicant_country_codes_gin
  ON public.scholarships USING gin (applicant_country_codes);

CREATE INDEX IF NOT EXISTS scholarships_host_country_codes_gin
  ON public.scholarships USING gin (host_country_codes);

CREATE INDEX IF NOT EXISTS scholarships_country_eligibility_active_idx
  ON public.scholarships (is_active)
  WHERE is_active = true
    AND (
      jsonb_array_length(applicant_country_codes) > 0 OR
      jsonb_array_length(host_country_codes) > 0
    );

-- Keep the listing view aligned with the table columns used by the hub. The repo
-- does not carry the original view migration, so this definition intentionally
-- mirrors the fields expected by scholarshipListServer sorting/filtering.
DROP VIEW IF EXISTS public.scholarships_listing_view;
CREATE VIEW public.scholarships_listing_view AS
SELECT
  s.*,
  CASE
    WHEN s.deadline_date IS NULL THEN false
    ELSE s.deadline_date < CURRENT_DATE
  END AS is_expired,
  COALESCE(s.requirements_count, 999999) AS requirements_sort_value,
  COALESCE(s.applicants_count, 999999999) AS applicants_sort_value,
  CASE WHEN COALESCE(s.is_verified, false) THEN 0 ELSE 1 END AS verified_sort_key
FROM public.scholarships s;
