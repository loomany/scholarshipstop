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
import { SCHOLARSHIPS_PAGE_SIZE } from '@/app/scholarships/scholarshipListUrl';
import type { ProfilesRow } from '@/lib/scholarships/scholarshipMatch';
import type { createClient } from '@/utils/supabase/server';
import {
  moreFiltersToJson,
  type MoreFiltersJson
} from '@/lib/scholarships/scholarshipListApiCodec';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';

type ServerSupabaseClient = SupabaseClient<Database>;

/**
 * Hub `/scholarships` first paint: same catalog pipeline for signed-in and anonymous users.
 */
export async function fetchInitialHubScholarshipsPayload(
  supabase: ServerSupabaseClient,
  profile?: ProfilesRow | null
): Promise<ScholarshipListResult> {
  const defaultBounds = {
    amountMin: 0,
    amountMax: 50000,
    applicantsMin: 0,
    applicantsMax: 200000
  };
  const req = scholarshipListRequestFromParts({
    page: 1,
    limit: SCHOLARSHIPS_PAGE_SIZE,
    sort: 'magic',
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

  const result = await executeScholarshipListQuery(
    supabase,
    profile ? { ...req, personalizedProfile: profile } : req,
    {
      countOnly: false,
      /**
       * Include list meta on first paint so category counters are populated even
       * before client-side `/api/scholarships?meta=1` warms up.
       */
      includeMeta: true,
      includeCategoryCounts: true,
      isProSubscriber: false
    }
  );

  return result;
}

export async function fetchInitialLongTailScholarshipsPayload(
  supabase: ServerSupabaseClient,
  mode: LongTailListingMode
): Promise<{
  result: ScholarshipListResult;
  routeScope: LongTailRouteScopePayload;
}> {
  const bounds = await fetchGlobalFilterBounds(supabase);
  const moreFilters =
    mode.type === 'legacy'
      ? buildLongTailMoreFiltersState(bounds, mode.slug)
      : buildMoreFiltersForManifestEntry(bounds, mode.entry);
  const slugOnly = buildSeoSlugOnlyMoreFilters(bounds, mode);
  const longTailLegacySlugs =
    mode.type === 'legacy'
      ? [mode.slug]
      : ((mode.entry.legacyBaseSlugs ?? []) as LongTailSlug[]);
  const requiredSeoTags =
    mode.type === 'manifest'
      ? requiredSeoTagsForListingPath(mode.canonicalPath)
      : requiredSeoTagsForListingPath(mode.slug);
  const req = scholarshipListRequestFromParts({
    page: 1,
    limit: SCHOLARSHIPS_PAGE_SIZE,
    sort: 'magic',
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
    longTailLegacySlugs,
    similarTo: null,
    similarCategorySlug: null,
    listScope: 'catalog',
    requiredSeoTags
  });
  const result = await executeScholarshipListQueryWithSeoFallback(
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
      slugOnlyMoreFilters: slugOnly,
      bounds,
      isCategorySeo: false
    }
  );
  return {
    result,
    routeScope: {
      longTailLegacySlugs,
      requiredSeoTags,
      baseMoreFilters: moreFiltersToJson(moreFilters),
      slugOnlyMoreFilters: moreFiltersToJson(slugOnly),
      seoListingFallback: true
    }
  };
}

export type LongTailRouteScopePayload = {
  longTailLegacySlugs: string[];
  requiredSeoTags: string[];
  baseMoreFilters: MoreFiltersJson;
  slugOnlyMoreFilters: MoreFiltersJson;
  seoListingFallback: boolean;
};

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
    limit: SCHOLARSHIPS_PAGE_SIZE,
    sort: 'magic',
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
