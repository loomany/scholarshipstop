import {
  buildLongTailMoreFiltersState,
  type LongTailSlug
} from '@/app/scholarships/scholarshipLongTailPresets';
import { defaultMoreFiltersFromBounds } from '@/app/scholarships/moreFilters';
import {
  buildMoreFiltersForManifestEntry,
  buildSeoSlugOnlyMoreFilters,
  requiredSeoTagsForListingPath,
  type LongTailListingMode
} from '@/lib/scholarships/seoScholarshipListing';
import {
  executeScholarshipListQuery,
  executeScholarshipListQueryWithSeoFallback,
  fetchGlobalFilterBounds,
  resolveCatalogSubjectCategoryForPageSlug,
  scholarshipListRequestFromParts,
  type ScholarshipListResult
} from '@/lib/scholarships/scholarshipListServer';
import type { createClient } from '@/utils/supabase/server';

type ServerSupabaseClient = ReturnType<typeof createClient>;

/**
 * Hub `/scholarships` first paint: same catalog pipeline for signed-in and anonymous users.
 */
export async function fetchInitialHubScholarshipsPayload(
  supabase: ServerSupabaseClient
): Promise<ScholarshipListResult> {
  const defaultBounds = {
    amountMin: 0,
    amountMax: 50000,
    applicantsMin: 0,
    applicantsMax: 200000
  };
  const req = scholarshipListRequestFromParts({
    page: 1,
    limit: 12,
    sort: 'most_recent',
    tab: 'matches',
    q: '',
    category: null,
    categoryPageSlug: null,
    catalogSubjectCategoryId: null,
    deadline: 'any',
    state: null,
    ignored: null,
    saved: null,
    started: null,
    submitted: null,
    moreFilters: defaultMoreFiltersFromBounds(defaultBounds),
    longTailLegacySlugs: [],
    similarTo: null,
    similarCategorySlug: null,
    listScope: 'catalog',
    requiredSeoTags: []
  });

  const result = await executeScholarshipListQuery(supabase, req, {
    countOnly: false,
    includeMeta: false,
    includeCategoryCounts: false,
    isProSubscriber: false
  });

  return result;
}

export async function fetchInitialLongTailScholarshipsPayload(
  supabase: ServerSupabaseClient,
  mode: LongTailListingMode
): Promise<ScholarshipListResult> {
  const bounds = await fetchGlobalFilterBounds(supabase);
  const moreFilters =
    mode.type === 'legacy'
      ? buildLongTailMoreFiltersState(bounds, mode.slug)
      : buildMoreFiltersForManifestEntry(bounds, mode.entry);
  const slugOnly = buildSeoSlugOnlyMoreFilters(bounds, mode);
  const req = scholarshipListRequestFromParts({
    page: 1,
    limit: 12,
    sort: 'most_recent',
    tab: 'matches',
    q: '',
    category: null,
    categoryPageSlug: null,
    catalogSubjectCategoryId: null,
    deadline: 'any',
    state: null,
    ignored: null,
    saved: null,
    started: null,
    submitted: null,
    moreFilters,
    longTailLegacySlugs:
      mode.type === 'legacy'
        ? [mode.slug]
        : ((mode.entry.legacyBaseSlugs ?? []) as LongTailSlug[]),
    similarTo: null,
    similarCategorySlug: null,
    listScope: 'catalog',
    requiredSeoTags:
      mode.type === 'manifest'
        ? requiredSeoTagsForListingPath(mode.canonicalPath)
        : requiredSeoTagsForListingPath(mode.slug)
  });
  return executeScholarshipListQueryWithSeoFallback(
    supabase,
    req,
    {
      countOnly: false,
      includeMeta: true,
      includeCategoryCounts: false,
      isProSubscriber: false
    },
    {
      enable: true,
      slugOnlyMoreFilters: slugOnly,
      bounds,
      isCategorySeo: false
    }
  );
}

export async function fetchInitialCategoryScholarshipsPayload(
  supabase: ServerSupabaseClient,
  categorySlug: string
): Promise<ScholarshipListResult> {
  const bounds = await fetchGlobalFilterBounds(supabase);
  const resolved = await resolveCatalogSubjectCategoryForPageSlug(
    supabase,
    categorySlug
  );
  const req = scholarshipListRequestFromParts({
    page: 1,
    limit: 12,
    sort: 'most_recent',
    tab: 'matches',
    q: '',
    category: null,
    categoryPageSlug: resolved.legacyCategoryPageSlug,
    catalogSubjectCategoryId: resolved.catalogSubjectCategoryId,
    deadline: 'any',
    state: null,
    ignored: null,
    saved: null,
    started: null,
    submitted: null,
    moreFilters: defaultMoreFiltersFromBounds(bounds),
    longTailLegacySlugs: [],
    similarTo: null,
    similarCategorySlug: null,
    listScope: 'catalog',
    requiredSeoTags: []
  });
  return executeScholarshipListQueryWithSeoFallback(
    supabase,
    req,
    {
      countOnly: false,
      includeMeta: true,
      includeCategoryCounts: true,
      isProSubscriber: false
    },
    {
      enable: true,
      slugOnlyMoreFilters: null,
      bounds,
      isCategorySeo: true
    }
  );
}

export function buildInitialListRequestKey(args: {
  kind: 'hub' | 'long_tail' | 'category';
  routeKey: string;
  searchParamsString?: string;
}): string {
  const search = args.searchParamsString?.trim() ?? '';
  return `${args.kind}:${args.routeKey}:${search}`;
}

export type InitialScholarshipsPayload = {
  requestKey: string;
  result: ScholarshipListResult;
};

export function createInitialScholarshipsPayload(
  requestKey: string,
  result: ScholarshipListResult
): InitialScholarshipsPayload {
  return { requestKey, result };
}
