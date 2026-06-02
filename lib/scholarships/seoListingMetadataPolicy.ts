import 'server-only';

import { createPublicClient } from '@/utils/supabase/public';
import { type LongTailSlug } from '@/app/scholarships/scholarshipLongTailPresets';
import { defaultMoreFiltersFromBounds } from '@/app/scholarships/moreFilters';
import {
  executeScholarshipListQueryWithSeoFallback,
  fetchGlobalFilterBounds,
  resolveCatalogSubjectCategoryForPageSlug,
  scholarshipListRequestFromParts
} from '@/lib/scholarships/scholarshipListServer';
import { widenScholarshipSeoPath } from '@/lib/scholarships/seoScholarshipCanonical';
import { seoBroadFallbackNoindexFromListResult } from '@/lib/scholarships/seoListingBroadNoindex';

const SEO_METADATA_POLICY_TTL_MS = 2 * 60 * 1000;

type BasicThinResult = {
  thinListing: boolean;
  broadFallbackNoindex: boolean;
};

const categoryThinCache = new Map<
  string,
  { value: BasicThinResult; expiresAt: number }
>();

function readTtlCache<T>(
  cache: Map<string, { value: T; expiresAt: number }>,
  key: string
): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function writeTtlCache<T>(
  cache: Map<string, { value: T; expiresAt: number }>,
  key: string,
  value: T
) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + SEO_METADATA_POLICY_TTL_MS
  });
}

function listingReq(
  bounds: Awaited<ReturnType<typeof fetchGlobalFilterBounds>>,
  patch: {
    moreFilters: import('@/app/scholarships/moreFilters').MoreFiltersState;
    longTailLegacySlugs: LongTailSlug[];
    categoryPageSlug: string | null;
    catalogSubjectCategoryId?: string | null;
    requiredSeoTags?: string[];
  }
) {
  return scholarshipListRequestFromParts({
    page: 1,
    limit: 1,
    sort: 'magic',
    tab: 'matches',
    q: '',
    category: null,
    categoryPageSlug: patch.categoryPageSlug,
    catalogSubjectCategoryId: patch.catalogSubjectCategoryId ?? null,
    deadline: 'any',
    state: null,
    ignored: null,
    saved: null,
    started: null,
    submitted: null,
    moreFilters: patch.moreFilters,
    longTailLegacySlugs: patch.longTailLegacySlugs,
    similarTo: null,
    similarCategorySlug: null,
    listScope: 'catalog',
    requiredSeoTags: patch.requiredSeoTags
  });
}

export function seoThinCanonicalHref(args: {
  kind: 'manifest' | 'legacy' | 'category';
  canonicalPath: string;
}): string {
  if (args.kind === 'legacy') return '/scholarships';
  if (args.kind === 'category') return '/scholarships';
  const w = widenScholarshipSeoPath(args.canonicalPath);
  if (w) return `/scholarships/${w}`;
  return '/scholarships';
}

export async function evaluateCategorySeoListingThin(
  categorySlug: string
): Promise<BasicThinResult> {
  const cached = readTtlCache(categoryThinCache, categorySlug);
  if (cached) return cached;
  const supabase = createPublicClient() as any;
  if (!supabase) {
    const value: BasicThinResult = {
      thinListing: true,
      broadFallbackNoindex: false
    };
    writeTtlCache(categoryThinCache, categorySlug, value);
    return value;
  }
  const bounds = await fetchGlobalFilterBounds(supabase);
  const resolved = await resolveCatalogSubjectCategoryForPageSlug(
    supabase,
    categorySlug
  );
  const mf = defaultMoreFiltersFromBounds(bounds);
  const req = listingReq(bounds, {
    moreFilters: mf,
    longTailLegacySlugs: [],
    categoryPageSlug: resolved.legacyCategoryPageSlug,
    catalogSubjectCategoryId: resolved.catalogSubjectCategoryId
  });
  const r = await executeScholarshipListQueryWithSeoFallback(
    supabase,
    req,
    {
      countOnly: true,
      includeMeta: false,
      isProSubscriber: true
    },
    {
      enable: true,
      slugOnlyMoreFilters: null,
      bounds,
      isCategorySeo: true
    }
  );
  const value: BasicThinResult = {
    thinListing: Boolean(r.seoFallback?.thinListing),
    broadFallbackNoindex: seoBroadFallbackNoindexFromListResult(r)
  };
  writeTtlCache(categoryThinCache, categorySlug, value);
  return value;
}
