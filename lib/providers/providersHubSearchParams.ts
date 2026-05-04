import { US_STATE_CODE_TO_NAME } from '@/lib/constants/usStates';
import {
  parseProvidersHubCountryParam,
  type ProvidersHubCountryBucket
} from '@/lib/providers/providersHubCountryFilter';
import { parseProvidersHubPageParam } from '@/lib/providers/providersHubUrl';

export type ProvidersHubSearchParams = {
  q?: string | string[];
  state?: string | string[];
  country?: string | string[];
  page?: string | string[];
  sort?: string | string[];
};

export function searchQueryFromParams(
  q: string | string[] | undefined
): string | undefined {
  if (typeof q === 'string') return q;
  if (Array.isArray(q) && q[0]) return q[0];
  return undefined;
}

/** Two-letter USPS state code from `?state=` when valid. */
export function parseProvidersHubStateQueryParam(
  raw: string | string[] | undefined
): string | undefined {
  const s = typeof raw === 'string' ? raw : raw?.[0];
  if (!s?.trim()) return undefined;
  const code = s.trim().toUpperCase();
  if (code.length !== 2) return undefined;
  if (!US_STATE_CODE_TO_NAME[code]) return undefined;
  return code;
}

/** `/providers` default listing — indexable only when unfiltered. */
export function providersHubNationalIsSeoIndexable(
  searchParams: ProvidersHubSearchParams | undefined
): boolean {
  if (!searchParams) return true;
  const allowed = new Set(['q', 'state', 'country', 'page', 'sort']);
  for (const key of Object.keys(searchParams)) {
    if (!allowed.has(key)) return false;
  }
  const q = searchQueryFromParams(searchParams.q)?.trim();
  const stateCode = parseProvidersHubStateQueryParam(searchParams.state) ?? '';
  const countryBucket = parseProvidersHubCountryParam(searchParams.country);
  const page = parseProvidersHubPageParam(searchParams.page);
  const sortRaw =
    typeof searchParams.sort === 'string'
      ? searchParams.sort
      : Array.isArray(searchParams.sort)
        ? searchParams.sort[0]
        : undefined;
  if (q) return false;
  if (stateCode) return false;
  if (countryBucket !== 'all') return false;
  if (page > 1) return false;
  if (sortRaw?.trim()) return false;
  return true;
}

/** `/providers/{stateSlug}` — indexable when no extra filters in query. */
export function providersHubStatePathIsSeoIndexable(
  searchParams: ProvidersHubSearchParams | undefined
): boolean {
  if (!searchParams) return true;
  const allowed = new Set(['q', 'country', 'page', 'sort']);
  for (const key of Object.keys(searchParams)) {
    if (!allowed.has(key)) return false;
  }
  const q = searchQueryFromParams(searchParams.q)?.trim();
  const countryBucket = parseProvidersHubCountryParam(searchParams.country);
  const page = parseProvidersHubPageParam(searchParams.page);
  const sortRaw =
    typeof searchParams.sort === 'string'
      ? searchParams.sort
      : Array.isArray(searchParams.sort)
        ? searchParams.sort[0]
        : undefined;
  if (q) return false;
  if (countryBucket !== 'all') return false;
  if (page > 1) return false;
  if (sortRaw?.trim()) return false;
  return true;
}

export function parseProvidersHubListingInputs(
  searchParams: ProvidersHubSearchParams,
  pathStateCode: string
): {
  q: string | undefined;
  countryBucket: ProvidersHubCountryBucket;
  stateCode: string;
  currentPage: number;
} {
  const q = searchQueryFromParams(searchParams.q);
  const countryBucket = parseProvidersHubCountryParam(searchParams.country);
  let stateCode =
    pathStateCode || parseProvidersHubStateQueryParam(searchParams.state) || '';
  if (countryBucket === 'other') {
    stateCode = '';
  }
  const currentPage = parseProvidersHubPageParam(searchParams.page);
  return { q, countryBucket, stateCode, currentPage };
}
