/**
 * Hub clean URLs: `/scholarships/hub/{segment}` ↔ listing tab (+ optional audience).
 * Routing/middleware/client integration comes in a later step; keep mapping logic here.
 */

import {
  LEGACY_BEST_RECOMMENDATION_TAB_ID,
  SCHOLARSHIP_LIST_TAB_IDS,
  parseScholarshipTabParam,
  type ScholarshipListTabId
} from '@/app/scholarships/scholarshipTabs';

export const HUB_PATH_PREFIX = 'hub';

/** Path segment for “International Friendly”: same listing as Matches + `aud=international_friendly`. */
export const HUB_INTERNATIONAL_SEGMENT = 'international-friendly';

const SCHOLARSHIPS_HUB_BASE = '/scholarships/hub';

const TAB_ID_SET = new Set<string>(SCHOLARSHIP_LIST_TAB_IDS);

export type ScholarshipHubAudienceParam = 'any' | 'international_friendly';

export type ScholarshipHubPathTabInput = ScholarshipListTabId | typeof HUB_INTERNATIONAL_SEGMENT;

export type HubPathToTabResult = {
  tab: ScholarshipListTabId;
  audience: ScholarshipHubAudienceParam;
};

function normalizeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw.trim()).toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

function slugSegmentToTabId(slug: string): ScholarshipListTabId | null {
  const s = normalizeSegment(slug);
  if (s === normalizeSegment(HUB_INTERNATIONAL_SEGMENT)) {
    return null;
  }
  const n =
    s === LEGACY_BEST_RECOMMENDATION_TAB_ID ? 'best-recommendation' : s;
  if (!n || !TAB_ID_SET.has(n)) {
    return null;
  }
  return n as ScholarshipListTabId;
}

/**
 * Canonical hub pathname for a sidebar / listing tab.
 * `international-friendly` is a path segment only (not a `ScholarshipListTabId`).
 */
export function tabToHubPath(tab: ScholarshipHubPathTabInput): string {
  const segment =
    tab === HUB_INTERNATIONAL_SEGMENT ? HUB_INTERNATIONAL_SEGMENT : tab;
  return `${SCHOLARSHIPS_HUB_BASE}/${segment}`;
}

/**
 * Parse normalized `slugPath` segments (after `/scholarships/`) for `hub/{segment}`.
 */
export function hubPathToTab(segments: string[]): HubPathToTabResult | null {
  if (segments.length !== 2) return null;
  if (normalizeSegment(segments[0]!) !== HUB_PATH_PREFIX) return null;

  const slug = segments[1]!;
  if (normalizeSegment(slug) === normalizeSegment(HUB_INTERNATIONAL_SEGMENT)) {
    return { tab: 'matches', audience: 'international_friendly' };
  }

  const tab = slugSegmentToTabId(slug);
  if (!tab) return null;

  return { tab, audience: 'any' };
}

/**
 * Client `pathname` e.g. `/scholarships/hub/easy-apply` → same as `hubPathToTab(['hub','easy-apply'])`.
 * Returns `null` for `/scholarships`, SEO slugs, detail UUID paths, etc.
 */
export function hubResolvedFromPathname(
  pathname: string | null | undefined
): HubPathToTabResult | null {
  if (!pathname?.trim()) return null;
  const prefix = '/scholarships/';
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const segments = rest.split('/').filter((s) => s.length > 0);
  return hubPathToTab(segments);
}

/**
 * Legacy `/scholarships?tab=…&scope=…` → `/scholarships/hub/…` + remaining query.
 * Drops `tab` and `scope`; drops `aud` when moving to `/hub/international-friendly`.
 */
export function legacyTabQueryToHubPath(
  searchParams: URLSearchParams
): { pathname: string; search: string } | null {
  const rawTab = searchParams.get('tab')?.trim();
  if (!rawTab) return null;

  const tab = parseScholarshipTabParam(rawTab);
  const aud = searchParams.get('aud')?.trim();

  const rest = new URLSearchParams(searchParams.toString());
  rest.delete('tab');
  rest.delete('scope');

  let pathname: string;

  if (tab === 'matches' && aud === 'international_friendly') {
    rest.delete('aud');
    pathname = tabToHubPath(HUB_INTERNATIONAL_SEGMENT);
  } else {
    pathname = tabToHubPath(tab as ScholarshipHubPathTabInput);
  }

  const search = rest.toString();
  return { pathname, search };
}
