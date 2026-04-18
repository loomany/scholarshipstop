import {
  SEO_ROUTE_STATE_CODE_TO_SLUG,
  SEO_ROUTE_STATE_SLUG_TO_CODE,
  SEO_ROUTE_STATE_SLUG_TO_LABEL
} from '@/lib/scholarships/seoTags/routeSegmentMaps';

export const STATE_VS_SEPARATOR = '-vs-';

export function parseStateVsSlug(raw: string): [string, string] | null {
  const slug = raw.trim().toLowerCase();
  const idx = slug.indexOf(STATE_VS_SEPARATOR);
  if (idx <= 0) return null;
  const a = slug.slice(0, idx).trim();
  const b = slug.slice(idx + STATE_VS_SEPARATOR.length).trim();
  if (!a || !b || a === b) return null;
  return [a, b];
}

export function canonicalStateVsSlug(raw: string): string | null {
  const parsed = parseStateVsSlug(raw);
  if (!parsed) return null;
  const [x, y] = parsed;
  if (!SEO_ROUTE_STATE_SLUG_TO_CODE[x] || !SEO_ROUTE_STATE_SLUG_TO_CODE[y]) {
    return null;
  }
  const sorted = [x, y].sort((l, r) => l.localeCompare(r, 'en'));
  return `${sorted[0]}${STATE_VS_SEPARATOR}${sorted[1]}`;
}

export function stateComparePath(canonicalSlug: string): string {
  return `/compare/states/${canonicalSlug}`;
}

export function stateCodeFromSlug(slug: string): string | null {
  return SEO_ROUTE_STATE_SLUG_TO_CODE[slug.trim().toLowerCase()] ?? null;
}

export function stateSlugFromCode(code: string): string | null {
  return SEO_ROUTE_STATE_CODE_TO_SLUG[code.trim().toUpperCase()] ?? null;
}

export function stateLabelFromSlug(slug: string): string | null {
  return SEO_ROUTE_STATE_SLUG_TO_LABEL[slug.trim().toLowerCase()] ?? null;
}
