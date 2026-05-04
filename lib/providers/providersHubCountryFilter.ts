/**
 * Providers hub: country is derived from `provider_hub_listing.state` until a
 * dedicated country column exists (US state present ⇒ United States; else broader / unknown).
 */
export type ProvidersHubCountryBucket = 'all' | 'us' | 'other';

export const PROVIDERS_HUB_COUNTRY_PARAM = 'country';

const ALLOWED = new Set(['us', 'other']);

export function parseProvidersHubCountryParam(
  raw: string | string[] | undefined
): ProvidersHubCountryBucket {
  const s = (typeof raw === 'string' ? raw : raw?.[0])?.trim().toLowerCase();
  if (s && ALLOWED.has(s)) {
    return s as 'us' | 'other';
  }
  return 'all';
}

export function providersHubCountryQueryValue(
  bucket: ProvidersHubCountryBucket
): string | undefined {
  if (bucket === 'all') return undefined;
  return bucket;
}
