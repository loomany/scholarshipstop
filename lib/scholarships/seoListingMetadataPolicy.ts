import 'server-only';

import { createPublicClient } from '@/utils/supabase/public';
import {
  buildLongTailMoreFiltersState,
  type LongTailSlug
} from '@/app/scholarships/scholarshipLongTailPresets';
import { defaultMoreFiltersFromBounds } from '@/app/scholarships/moreFilters';
import {
  executeScholarshipListQueryWithSeoFallback,
  fetchGlobalFilterBounds,
  resolveCatalogSubjectCategoryForPageSlug,
  scholarshipListRequestFromParts
} from '@/lib/scholarships/scholarshipListServer';
import {
  buildMoreFiltersForManifestEntry,
  buildSeoSlugOnlyMoreFilters,
  requiredSeoTagsForListingPath,
  type LongTailListingMode
} from '@/lib/scholarships/seoScholarshipListing';
import type { SeoScholarshipRouteManifestEntry } from '@/lib/scholarships/seoScholarshipManifest';
import { SEO_GOOD_MIN_RESULTS } from '@/lib/scholarships/seoRouteQuality';
import { widenScholarshipSeoPath } from '@/lib/scholarships/seoScholarshipCanonical';
import { seoBroadFallbackNoindexFromListResult } from '@/lib/scholarships/seoListingBroadNoindex';

const SEO_METADATA_POLICY_TTL_MS = 2 * 60 * 1000;

type ManifestThinResult = {
  thinListing: boolean;
  broadFallbackNoindex: boolean;
  widenTo: string | null;
  fallbackUsed: boolean;
  exactCount: number;
  renderedCount: number;
};

type BasicThinResult = {
  thinListing: boolean;
  broadFallbackNoindex: boolean;
};

const manifestThinCache = new Map<
  string,
  { value: ManifestThinResult; expiresAt: number }
>();
const legacyThinCache = new Map<
  string,
  { value: BasicThinResult; expiresAt: number }
>();
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
    sort: 'most_recent',
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

/** Live DB: thin (&lt;5) or exact=0 with huge fallback → noindex + follow + canonical widen. */
export async function evaluateManifestSeoListingThin(
  entry: SeoScholarshipRouteManifestEntry
): Promise<ManifestThinResult> {
  const cacheKey = [
    entry.canonicalPath,
    entry.canonicalTarget ?? '',
    entry.indexable === true ? '1' : '0',
    entry.noindexNow === true ? '1' : '0',
    entry.qualityBucket ?? ''
  ].join('|');
  const cached = readTtlCache(manifestThinCache, cacheKey);
  if (cached) return cached;
  const supabase = createPublicClient() as any;
  const bounds = await fetchGlobalFilterBounds(supabase);
  const mode: LongTailListingMode = {
    type: 'manifest',
    canonicalPath: entry.canonicalPath,
    entry
  };
  const mf = buildMoreFiltersForManifestEntry(bounds, entry);
  const slugOnly = buildSeoSlugOnlyMoreFilters(bounds, mode);
  const req = listingReq(bounds, {
    moreFilters: mf,
    longTailLegacySlugs: (entry.legacyBaseSlugs ?? []) as LongTailSlug[],
    categoryPageSlug: null,
    requiredSeoTags: requiredSeoTagsForListingPath(entry.canonicalPath)
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
      slugOnlyMoreFilters: slugOnly,
      bounds,
      isCategorySeo: false
    }
  );
  const thin = Boolean(r.seoFallback?.thinListing);
  const broad = seoBroadFallbackNoindexFromListResult(r);
  const fallbackUsed = Boolean(r.seoFallback?.used);
  const exactCount =
    r.seoFallback?.exactTotal !== undefined ? r.seoFallback.exactTotal : r.total;
  const renderedCount = r.total;
  const policy =
    thin ||
    broad ||
    fallbackUsed ||
    exactCount <= 0 ||
    renderedCount < SEO_GOOD_MIN_RESULTS;
  const value: ManifestThinResult = {
    thinListing: thin,
    broadFallbackNoindex: broad,
    widenTo:
      policy
        ? entry.canonicalTarget ?? widenScholarshipSeoPath(entry.canonicalPath)
        : null,
    fallbackUsed,
    exactCount,
    renderedCount
  };
  writeTtlCache(manifestThinCache, cacheKey, value);
  return value;
}

export async function evaluateLegacyPresetSeoListingThin(
  slug: LongTailSlug
): Promise<BasicThinResult> {
  const cached = readTtlCache(legacyThinCache, slug);
  if (cached) return cached;
  const supabase = createPublicClient() as any;
  const bounds = await fetchGlobalFilterBounds(supabase);
  const mf = buildLongTailMoreFiltersState(bounds, slug);
  const mode: LongTailListingMode = { type: 'legacy', slug };
  const slugOnly = buildSeoSlugOnlyMoreFilters(bounds, mode);
  const req = listingReq(bounds, {
    moreFilters: mf,
    longTailLegacySlugs: [slug],
    categoryPageSlug: null,
    requiredSeoTags: requiredSeoTagsForListingPath(slug)
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
      slugOnlyMoreFilters: slugOnly,
      bounds,
      isCategorySeo: false
    }
  );
  const value: BasicThinResult = {
    thinListing: Boolean(r.seoFallback?.thinListing),
    broadFallbackNoindex: seoBroadFallbackNoindexFromListResult(r)
  };
  writeTtlCache(legacyThinCache, slug, value);
  return value;
}

export async function evaluateCategorySeoListingThin(
  categorySlug: string
): Promise<BasicThinResult> {
  const cached = readTtlCache(categoryThinCache, categorySlug);
  if (cached) return cached;
  const supabase = createPublicClient() as any;
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
