-- ============================================================================
-- Scholarships cleanup — DRY RUN ONLY
-- Every statement below is SELECT. No UPDATE / DELETE / INSERT.
-- Run manually in Supabase SQL or psql when ready to review candidates.
-- Heuristics approximate the TS audit; final scores live in generated CSV/JSON.
-- ============================================================================

-- ----- Helper: primary URL (apply_url preferred) -----------------------------

-- ----- 1) Expired > 12 months (deadline_date) --------------------------------

SELECT
  'expired_gt_12mo' AS cohort,
  id,
  title,
  source,
  provider_name,
  deadline_date,
  coalesce(nullif(trim(apply_url), ''), nullif(trim(url), '')) AS primary_url
FROM public.scholarships
WHERE deadline_date IS NOT NULL
  AND deadline_date::date < (timezone('UTC', now())::date - interval '12 months')
ORDER BY deadline_date ASC
LIMIT 500;

-- Full count
SELECT 'expired_gt_12mo_count' AS metric, count(*)::bigint AS value
FROM public.scholarships
WHERE deadline_date IS NOT NULL
  AND deadline_date::date < (timezone('UTC', now())::date - interval '12 months');

-- ----- 2) Expired 6–12 months (for “soft recent closed” policy) --------------

SELECT
  'expired_6_to_12mo' AS cohort,
  id,
  title,
  source,
  deadline_date,
  coalesce(nullif(trim(apply_url), ''), nullif(trim(url), '')) AS primary_url
FROM public.scholarships
WHERE deadline_date IS NOT NULL
  AND deadline_date::date >= (timezone('UTC', now())::date - interval '12 months')
  AND deadline_date::date < timezone('UTC', now())::date
ORDER BY deadline_date DESC
LIMIT 300;

-- ----- 3) Missing deadline entirely -------------------------------------------

SELECT
  'missing_deadline' AS cohort,
  id,
  title,
  source,
  provider_name,
  coalesce(nullif(trim(apply_url), ''), nullif(trim(url), '')) AS primary_url
FROM public.scholarships
WHERE (deadline_date IS NULL)
  AND (deadline_text IS NULL OR trim(deadline_text) = '')
ORDER BY updated_at DESC NULLS LAST
LIMIT 500;

-- ----- 4) Parser / garbage text candidates ----------------------------------

SELECT
  'parser_garbage_blob' AS cohort,
  id,
  title,
  source,
  substring(coalesce(description, '') || ' ' || coalesce(summary_short, '') || ' ' || coalesce(summary_long, ''), 1, 240) AS text_sample
FROM public.scholarships
WHERE lower(coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(summary_short, '') || ' ' || coalesce(summary_long, ''))
  ~ '(undefined|null|nan|lorem ipsum|click here|read more|page not found|access denied|javascript:|cookie policy)'
ORDER BY updated_at DESC NULLS LAST
LIMIT 500;

-- ----- 5) Likely weak / trash proxies (SQL approximation) --------------------
-- Short title, empty description blob, or title heavily numeric/symbolic.

SELECT
  'weak_short_title' AS cohort,
  id,
  title,
  source,
  length(trim(coalesce(title, ''))) AS title_len
FROM public.scholarships
WHERE length(trim(coalesce(title, ''))) > 0
  AND length(trim(coalesce(title, ''))) < 10
LIMIT 200;

SELECT
  'empty_description_all' AS cohort,
  id,
  title,
  source,
  coalesce(nullif(trim(apply_url), ''), nullif(trim(url), '')) AS primary_url
FROM public.scholarships
WHERE coalesce(trim(description), '') = ''
  AND coalesce(trim(summary_short), '') = ''
  AND coalesce(trim(summary_long), '') = ''
LIMIT 500;

-- Anti-keyword style (high false positive rate — use for triage only)
SELECT
  'anti_keyword_triage' AS cohort,
  id,
  title,
  source,
  coalesce(nullif(trim(apply_url), ''), nullif(trim(url), '')) AS primary_url
FROM public.scholarships
WHERE lower(coalesce(title, '') || ' ' || coalesce(description, ''))
  ~ '\bloan\b|\bjob\b|credit card|\bcasino\b|sign\s*in|privacy policy|terms of service'
LIMIT 500;

-- ----- 6) Duplicate groups: same primary URL ---------------------------------

WITH primary_url AS (
  SELECT
    id,
    title,
    source,
    provider_name,
    apply_url,
    url,
    CASE
      WHEN apply_url IS NOT NULL AND trim(apply_url) <> '' THEN trim(apply_url)
      WHEN url IS NOT NULL AND trim(url) <> '' THEN trim(url)
      ELSE NULL
    END AS pu
  FROM public.scholarships
),
dups AS (
  SELECT pu
  FROM primary_url
  WHERE pu IS NOT NULL
  GROUP BY pu
  HAVING count(*) > 1
)
SELECT
  'duplicate_primary_url' AS cohort,
  p.id,
  p.title,
  p.source,
  p.provider_name,
  p.pu AS primary_url,
  cnt.group_size
FROM primary_url p
JOIN (
  SELECT pu, count(*)::int AS group_size
  FROM primary_url
  WHERE pu IS NOT NULL
  GROUP BY pu
  HAVING count(*) > 1
) cnt ON cnt.pu = p.pu
ORDER BY cnt.group_size DESC, p.pu, p.id
LIMIT 800;

-- ----- 7) Duplicate groups: normalized title + normalized provider ----------

WITH norm AS (
  SELECT
    id,
    title,
    source,
    provider_name,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(title, '')), '[^a-z0-9]+', ' ', 'g'),
      '\s+', ' ', 'g'
    )) AS norm_title,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(provider_name, '')), '[^a-z0-9]+', ' ', 'g'),
      '\s+', ' ', 'g'
    )) AS norm_provider,
    coalesce(nullif(trim(apply_url), ''), nullif(trim(url), '')) AS primary_url
  FROM public.scholarships
),
keyed AS (
  SELECT *, norm_title || '||' || nullif(norm_provider, '') AS dup_key
  FROM norm
  WHERE norm_title <> '' AND nullif(norm_provider, '') IS NOT NULL
)
SELECT
  'duplicate_title_provider' AS cohort,
  k.id,
  k.title,
  k.source,
  k.provider_name,
  k.primary_url,
  g.cnt AS group_size
FROM keyed k
JOIN (
  SELECT dup_key, count(*)::int AS cnt
  FROM keyed
  GROUP BY dup_key
  HAVING count(*) > 1
) g ON g.dup_key = k.dup_key
ORDER BY g.cnt DESC, k.dup_key, k.id
LIMIT 800;

-- ----- 8) Duplicate groups: normalized title only (noisy — review carefully) -

WITH norm AS (
  SELECT
    id,
    title,
    source,
    provider_name,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(title, '')), '[^a-z0-9]+', ' ', 'g'),
      '\s+', ' ', 'g'
    )) AS norm_title,
    coalesce(nullif(trim(apply_url), ''), nullif(trim(url), '')) AS primary_url
  FROM public.scholarships
),
keyed AS (
  SELECT * FROM norm WHERE norm_title <> ''
)
SELECT
  'duplicate_norm_title' AS cohort,
  k.id,
  k.title,
  k.source,
  k.provider_name,
  k.primary_url,
  g.cnt AS group_size
FROM keyed k
JOIN (
  SELECT norm_title, count(*)::int AS cnt
  FROM keyed
  GROUP BY norm_title
  HAVING count(*) > 1
) g ON g.norm_title = k.norm_title
ORDER BY g.cnt DESC, k.norm_title, k.id
LIMIT 800;

-- ----- 8b) Duplicate: normalized title + deadline_date (non-null only) -------

WITH norm AS (
  SELECT
    id,
    title,
    source,
    provider_name,
    deadline_date,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(title, '')), '[^a-z0-9]+', ' ', 'g'),
      '\s+', ' ', 'g'
    )) AS norm_title,
    coalesce(nullif(trim(apply_url), ''), nullif(trim(url), '')) AS primary_url
  FROM public.scholarships
  WHERE deadline_date IS NOT NULL
),
keyed AS (
  SELECT *, norm_title || '||' || deadline_date::text AS dup_key
  FROM norm
  WHERE norm_title <> ''
)
SELECT
  'duplicate_title_deadline' AS cohort,
  k.id,
  k.title,
  k.source,
  k.deadline_date,
  k.primary_url,
  g.cnt AS group_size
FROM keyed k
JOIN (
  SELECT dup_key, count(*)::int AS cnt
  FROM keyed
  GROUP BY dup_key
  HAVING count(*) > 1
) g ON g.dup_key = k.dup_key
ORDER BY g.cnt DESC, k.dup_key, k.id
LIMIT 500;

-- ----- 9) High-volume sources (for operational review) ----------------------

SELECT
  coalesce(nullif(trim(source), ''), '(null)') AS source,
  count(*)::bigint AS total,
  count(*) FILTER (
    WHERE deadline_date IS NOT NULL
      AND deadline_date::date < timezone('UTC', now())::date
  )::bigint AS expired_any,
  count(*) FILTER (
    WHERE deadline_date IS NOT NULL
      AND deadline_date::date < (timezone('UTC', now())::date - interval '12 months')
  )::bigint AS expired_gt_12mo,
  count(*) FILTER (
    WHERE coalesce(trim(description), '') = ''
      AND coalesce(trim(summary_short), '') = ''
      AND coalesce(trim(summary_long), '') = ''
  )::bigint AS empty_description_blob
FROM public.scholarships
GROUP BY 1
ORDER BY total DESC;

-- ----- 10) Test / suspect tiny sources --------------------------------------

SELECT
  'tiny_sources' AS cohort,
  coalesce(nullif(trim(source), ''), '(null)') AS source,
  count(*)::bigint AS n,
  min(title) AS sample_title
FROM public.scholarships
GROUP BY 1
HAVING count(*) <= 5
ORDER BY n ASC, source;
