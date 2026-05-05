-- ============================================================================
-- Scholarships quality audit — READ ONLY (SELECT only)
-- Table: public.scholarships
-- Run in Supabase SQL editor or psql against the project database.
-- Adjust none of the data; use findings for manual / scripted follow-up.
-- ============================================================================

-- ----- A. Row counts ---------------------------------------------------------

SELECT 'total_rows' AS metric, count(*)::bigint AS value FROM public.scholarships;

SELECT 'active_is_active_true' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE coalesce(is_active, false) = true;

SELECT 'inactive_or_null_is_active' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE coalesce(is_active, false) = false;

SELECT 'indexable_true' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE is_indexable IS TRUE;

-- ----- A. Null / empty core fields ------------------------------------------

SELECT 'null_title' AS metric, count(*)::bigint AS value
FROM public.scholarships WHERE title IS NULL OR trim(title) = '';

SELECT 'null_or_short_description' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE coalesce(trim(description), '') = ''
  AND coalesce(trim(summary_short), '') = ''
  AND coalesce(trim(summary_long), '') = '';

SELECT 'null_provider_name' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE provider_name IS NULL OR trim(provider_name) = '';

SELECT 'no_url_and_no_apply_url' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE (url IS NULL OR trim(url) = '')
  AND (apply_url IS NULL OR trim(apply_url) = '');

SELECT 'null_deadline_date_and_empty_deadline_text' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE deadline_date IS NULL
  AND (deadline_text IS NULL OR trim(deadline_text) = '');

SELECT 'null_award_amount_text_and_no_numeric_range' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE (award_amount_text IS NULL OR trim(award_amount_text) = '')
  AND award_amount_min IS NULL
  AND award_amount_max IS NULL;

-- ----- A. Expired (deadline_date vs today) -----------------------------------

SELECT 'expired_deadline_date' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE deadline_date IS NOT NULL
  AND deadline_date::date < (timezone('UTC', now()))::date;

SELECT 'deadline_date_older_than_1_year' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE deadline_date IS NOT NULL
  AND deadline_date::date < (timezone('UTC', now())::date - interval '1 year');

SELECT 'deadline_date_year_out_of_range' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE deadline_date IS NOT NULL
  AND (extract(year from deadline_date::date) < 1990
    OR extract(year from deadline_date::date) > 2037);

-- ----- B. Normalized title helper (inline in CTEs) -------------------------
-- Normalization: lower, non-alphanumerics -> space, collapse spaces.

-- B1. Duplicate groups by normalized title (size > 1)

WITH norm AS (
  SELECT
    id,
    title,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(title, '')), '[^a-z0-9]+', ' ', 'g'),
      '\s+', ' ', 'g'
    )) AS norm_title
  FROM public.scholarships
),
dups AS (
  SELECT norm_title, count(*) AS cnt
  FROM norm
  WHERE norm_title <> ''
  GROUP BY norm_title
  HAVING count(*) > 1
)
SELECT count(*)::bigint AS duplicate_norm_title_groups FROM dups;

WITH norm AS (
  SELECT
    id,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(title, '')), '[^a-z0-9]+', ' ', 'g'),
      '\s+', ' ', 'g'
    )) AS norm_title
  FROM public.scholarships
),
dups AS (
  SELECT norm_title FROM norm WHERE norm_title <> '' GROUP BY norm_title HAVING count(*) > 1
)
SELECT count(*)::bigint AS rows_in_norm_title_dup_groups
FROM norm n
JOIN dups d ON d.norm_title = n.norm_title;

-- B2. Duplicate groups: normalized title + normalized provider_name

WITH norm AS (
  SELECT
    id,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(title, '')), '[^a-z0-9]+', ' ', 'g'),
      '\s+', ' ', 'g'
    )) AS norm_title,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(provider_name, '')), '[^a-z0-9]+', ' ', 'g'),
      '\s+', ' ', 'g'
    )) AS norm_provider
  FROM public.scholarships
),
keyed AS (
  SELECT id, norm_title || '||' || nullif(norm_provider, '') AS dup_key FROM norm
),
dups AS (
  SELECT dup_key, count(*) AS cnt FROM keyed WHERE dup_key IS NOT NULL GROUP BY dup_key HAVING count(*) > 1
)
SELECT count(*)::bigint AS duplicate_title_provider_groups FROM dups;

-- B3. Duplicate canonical URL (prefer apply_url, fallback url) — trimmed only

WITH u AS (
  SELECT id,
    CASE
      WHEN apply_url IS NOT NULL AND trim(apply_url) <> '' THEN trim(apply_url)
      WHEN url IS NOT NULL AND trim(url) <> '' THEN trim(url)
      ELSE NULL
    END AS primary_url
  FROM public.scholarships
),
dups AS (
  SELECT primary_url, count(*) AS cnt
  FROM u
  WHERE primary_url IS NOT NULL
  GROUP BY primary_url
  HAVING count(*) > 1
)
SELECT count(*)::bigint AS duplicate_primary_url_groups FROM dups;

-- B4. Same normalized title + deadline_date

WITH norm AS (
  SELECT
    id,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(title, '')), '[^a-z0-9]+', ' ', 'g'),
      '\s+', ' ', 'g'
    )) AS norm_title,
    deadline_date
  FROM public.scholarships
  WHERE deadline_date IS NOT NULL
),
keyed AS (
  SELECT id, norm_title || '||' || deadline_date::text AS dup_key
  FROM norm
  WHERE norm_title <> ''
),
dups AS (
  SELECT dup_key, count(*) AS cnt FROM keyed GROUP BY dup_key HAVING count(*) > 1
)
SELECT count(*)::bigint AS duplicate_title_deadline_groups FROM dups;

-- B5. Same normalized title + normalized award_amount_text

WITH norm AS (
  SELECT
    id,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(title, '')), '[^a-z0-9]+', ' ', 'g'),
      '\s+', ' ', 'g'
    )) AS norm_title,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(award_amount_text, '')), '[^a-z0-9]+', ' ', 'g'),
      '\s+', ' ', 'g'
    )) AS norm_amt
  FROM public.scholarships
),
keyed AS (
  SELECT id, norm_title || '||' || nullif(norm_amt, '') AS dup_key FROM norm WHERE norm_title <> ''
),
dups AS (
  SELECT dup_key, count(*) AS cnt FROM keyed WHERE dup_key IS NOT NULL GROUP BY dup_key HAVING count(*) > 1
)
SELECT count(*)::bigint AS duplicate_title_amount_groups FROM dups;

-- ----- C. Weak / suspicious text (simple ILIKE counts) ----------------------

SELECT 'title_len_lt_10' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE length(trim(coalesce(title, ''))) > 0 AND length(trim(coalesce(title, ''))) < 10;

SELECT 'description_all_sources_lt_100_chars' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE length(trim(coalesce(description, ''))) < 100
  AND length(trim(coalesce(summary_short, ''))) < 100
  AND length(trim(coalesce(summary_long, ''))) < 100;

SELECT 'description_equals_title' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE trim(lower(coalesce(description, ''))) = trim(lower(coalesce(title, '')))
  AND trim(coalesce(title, '')) <> '';

SELECT 'title_has_parser_undefined_or_null_nan' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE lower(coalesce(title, '')) ~ '(undefined|null|nan|\blorem ipsum\b)';

SELECT 'description_has_parser_junk' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE lower(coalesce(description, '') || ' ' || coalesce(summary_short, '') || ' ' || coalesce(summary_long, ''))
  ~ '(undefined|null|nan|lorem ipsum|click here|read more|page not found|access denied|subscribe to|terms of service|privacy policy|javascript:|cookie policy|credit card|casino|crypto wallet)';

-- Positive relevance (at least one keyword in title or description blob)

SELECT 'missing_grant_positive_keywords' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE NOT (
  lower(coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(summary_short, '') || ' ' ||
        coalesce(summary_long, '') || ' ' || coalesce(category, ''))
  ~ '(scholarship|scholarships|grant|grants|fellowship|fellowships|bursar|financial aid|tuition|award|funding|stipend|student|undergraduate|graduate|college|university)'
);

-- ----- D. Rows per source ----------------------------------------------------

SELECT coalesce(nullif(trim(source), ''), '(null)') AS source, count(*)::bigint AS total
FROM public.scholarships
GROUP BY 1
ORDER BY total DESC
LIMIT 50;

-- ----- E. Sample duplicate keys (optional drill-down) ------------------------
-- Example: list top duplicate normalized titles with ids (limit 100 rows).

WITH norm AS (
  SELECT
    id,
    title,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(title, '')), '[^a-z0-9]+', ' ', 'g'),
      '\s+', ' ', 'g'
    )) AS norm_title
  FROM public.scholarships
),
dups AS (
  SELECT norm_title
  FROM norm
  WHERE norm_title <> ''
  GROUP BY norm_title
  HAVING count(*) > 1
)
SELECT n.id, n.title, n.norm_title
FROM norm n
JOIN dups d ON d.norm_title = n.norm_title
ORDER BY n.norm_title, n.id
LIMIT 100;
