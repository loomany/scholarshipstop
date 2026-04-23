/**
 * Hub listing URL: stable, business-only query string (aligned SSR ↔ client).
 * Strips internal Next / framework keys (e.g. _rsc) by allowlisting.
 */

const HUB_LISTING_URL_KEYS = [
  'aud',
  'category',
  'deadline',
  'email_ids',
  'limit',
  'page',
  'q',
  'return_to',
  'scope',
  'sort',
  'tab'
] as const;

type URLSearchParamsWithGetAll = { getAll(name: string): string[] };

/** Client / shared: build canonical string from current URL search params. */
export function scholarshipHubQueryStringFromURLSearchParams(
  sp: URLSearchParamsWithGetAll
): string {
  const w = new URLSearchParams();
  for (const key of HUB_LISTING_URL_KEYS) {
    for (const v of sp.getAll(key)) {
      if (v.length) w.append(key, v);
    }
  }
  return w.toString();
}

/**
 * RSC: Next `searchParams` record can include keys we must not put in cache keys
 * (e.g. future internals). We only read allowlisted business keys, in fixed order.
 */
export function scholarshipHubQueryStringFromNextSearchParamsRecord(
  searchParams?: Record<string, string | string[] | undefined>
): string {
  if (!searchParams) return '';
  const w = new URLSearchParams();
  for (const key of HUB_LISTING_URL_KEYS) {
    const value = searchParams[key];
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const part of value) {
        if (typeof part === 'string' && part) w.append(key, part);
      }
    } else if (typeof value === 'string' && value) {
      w.set(key, value);
    }
  }
  return w.toString();
}
