-- Audit: probable mis-filed HOST country stuck in applicant_country_codes only.
-- Preconditions (public.scholarships): host + applicant are jsonb arrays of ISO2 strings.
--
-- Count only (active rows):
SELECT COUNT(*) AS suspect_active_count
FROM public.scholarships
WHERE is_active = true
  AND COALESCE(jsonb_array_length(host_country_codes), 0) = 0
  AND jsonb_typeof(applicant_country_codes) = 'array'
  AND jsonb_array_length(applicant_country_codes) = 1;

-- Sample rows (active, adjust LIMIT):
SELECT
  id,
  slug,
  title,
  applicant_country_codes,
  host_country_codes,
  is_active
FROM public.scholarships
WHERE is_active = true
  AND COALESCE(jsonb_array_length(host_country_codes), 0) = 0
  AND jsonb_typeof(applicant_country_codes) = 'array'
  AND jsonb_array_length(applicant_country_codes) = 1
ORDER BY updated_at DESC NULLS LAST
LIMIT 200;

-- Optional: include inactive for full inventory
-- (same WHERE but drop `is_active = true`).
