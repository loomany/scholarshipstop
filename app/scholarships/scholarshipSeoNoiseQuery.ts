/**
 * Public scholarship pages should index only clean canonical URLs.
 * These params are useful for UX/listing state, but should not create indexable URLs.
 */
const SCHOLARSHIP_SEO_NOISE_QUERY_KEYS = [
  'app_cc',
  'aud',
  'category',
  'country',
  'deadline',
  'deadline_month',
  'email_ids',
  'field',
  'fbclid',
  'gclid',
  'host_cc',
  'limit',
  'mf',
  'msclkid',
  'next',
  'page',
  'provider',
  'provider_slug',
  'q',
  'return_to',
  'scope',
  'sort',
  'status',
  'step',
  'tab',
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
  'utm_term'
] as const;

type NextSearchParamsRecord = Record<string, string | string[] | undefined>;

function hasNonEmptySearchParamValue(
  value: string | string[] | undefined
): boolean {
  if (Array.isArray(value)) {
    return value.some(
      (part) => typeof part === 'string' && part.trim().length > 0
    );
  }
  return typeof value === 'string' && value.trim().length > 0;
}

export function isSeoNoiseQuery(
  searchParams?: NextSearchParamsRecord
): boolean {
  if (!searchParams) return false;
  return SCHOLARSHIP_SEO_NOISE_QUERY_KEYS.some((key) =>
    hasNonEmptySearchParamValue(searchParams[key])
  );
}
