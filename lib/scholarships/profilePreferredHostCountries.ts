import type { Json } from '@/types_db';

import { dedupeHostCountryCodesForDisplay } from '@/lib/scholarships/countryEligibility/countries';

/** Parse `profiles.preferred_host_country_codes` (jsonb string array). */
export function preferredHostCountryCodesFromProfileJson(raw: Json | null | undefined): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  const codes = raw
    .map((x) => (typeof x === 'string' ? x.trim().toUpperCase() : ''))
    .filter((c) => /^[A-Z]{2}$/.test(c));
  return dedupeHostCountryCodesForDisplay(codes);
}
