import type { ProvidersHubCountryBucket } from '@/lib/providers/providersHubCountryFilter';
import { providersHubCountryQueryValue } from '@/lib/providers/providersHubCountryFilter';
import { SEO_ROUTE_STATE_CODE_TO_SLUG } from '@/lib/scholarships/seoTags/routeSegmentMaps';

export const PROVIDERS_HUB_PAGE_SIZE = 8;

export function parseProvidersHubPageParam(
  raw: string | string[] | undefined
): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = parseInt(String(s ?? '1'), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

/**
 * Build `/providers` URLs. US state filters use a path segment (`/providers/texas`)
 * when `country` is not `other`. Remaining filters use query params.
 */
export function buildProvidersHubHref(options: {
  q?: string | null;
  state?: string | null;
  country?: ProvidersHubCountryBucket;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  const q = options.q?.trim();
  const state = options.state?.trim().toUpperCase();
  const country = options.country ?? 'all';
  if (q) sp.set('q', q);
  const countryQ = providersHubCountryQueryValue(country);
  if (countryQ) sp.set('country', countryQ);
  if (options.page != null && options.page > 1) {
    sp.set('page', String(options.page));
  }
  const query = sp.toString();

  if (state && state.length === 2 && country !== 'other') {
    const slug = SEO_ROUTE_STATE_CODE_TO_SLUG[state];
    if (slug) {
      const base = `/providers/${encodeURIComponent(slug)}`;
      return query ? `${base}?${query}` : base;
    }
  }

  if (query) return `/providers?${query}`;
  return '/providers';
}
