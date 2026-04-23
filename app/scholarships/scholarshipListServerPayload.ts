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
import { applyListingMetaGuestPatches } from '@/lib/scholarships/applyListingMetaGuestPatches';
import {
  executeScholarshipListQuery,
  executeScholarshipListQueryWithSeoFallback,
  fetchScholarshipListMeta,
  fetchGlobalFilterBounds,
  resolveCatalogSubjectCategoryForPageSlug,
  savedFiltersSnapshotJsonFromProfile,
  scholarshipListRequestFromParts,
  type ScholarshipListResult
} from '@/lib/scholarships/scholarshipListServer';
import {
  parseDeadlineFromParam,
  parseSortFromParam,
  SCHOLARSHIPS_PAGE_SIZE
} from '@/app/scholarships/scholarshipListUrl';
import { parseHubScholarshipTabParam } from '@/app/scholarships/scholarshipTabs';
import type { ProfilesRow } from '@/lib/scholarships/scholarshipMatch';
import type { createClient } from '@/utils/supabase/server';
import {
  moreFiltersFromJson,
  moreFiltersToJson,
  type MoreFiltersJson
} from '@/lib/scholarships/scholarshipListApiCodec';
import { stripHubProfileHardMatchMoreFilters } from '@/lib/scholarships/profileFilterDefaults';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';

type ServerSupabaseClient = SupabaseClient<Database>;

function getSearchParamValue(
  searchParams: URLSearchParams,
  key: string
): string | null {
  const value = searchParams.get(key);
  return value?.trim() ? value : null;
}

/**
 * Hub `/scholarships` first paint: same catalog pipeline for signed-in and anonymous users.
 */
export async function fetchInitialHubScholarshipsPayload(
  supabase: ServerSupabaseClient | null,
  profile?: ProfilesRow | null,
  searchParamsString = ''
): Promise<ScholarshipListResult> {
  if (!supabase) {
    return {
      scholarships: [],
      total: 0,
      page: 1,
      limit: SCHOLARSHIPS_PAGE_SIZE
    };
  }
  const defaultBounds = await fetchGlobalFilterBounds(supabase);
  const searchParams = new URLSearchParams(searchParamsString);
  let req = scholarshipListRequestFromParts({
    page: getSearchParamValue(searchParams, 'page'),
    limit: SCHOLARSHIPS_PAGE_SIZE,
    sort: parseSortFromParam(searchParams.get('sort')),
    tab: parseHubScholarshipTabParam(searchParams.get('tab')),
    q: getSearchParamValue(searchParams, 'q'),
    category: getSearchParamValue(searchParams, 'category'),
    categoryPageSlug: null,
    catalogSubjectCategoryId: null,
    deadline: parseDeadlineFromParam(searchParams.get('deadline')) ?? 'any',
    state: getSearchParamValue(searchParams, 'state'),
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
  const profileSavedFiltersSnapshotJson =
    savedFiltersSnapshotJsonFromProfile(profile);
  const profileSavedFiltersSnapshot =
    profileSavedFiltersSnapshotJson == null
      ? null
      : moreFiltersFromJson(profileSavedFiltersSnapshotJson, defaultBounds);
  if (profile) {
    req = {
      ...req,
      savedFiltersSnapshot: profileSavedFiltersSnapshot
    };
    if (req.tab === 'recommended' && profileSavedFiltersSnapshot != null) {
      req = {
        ...req,
        moreFilters: stripHubProfileHardMatchMoreFilters(profileSavedFiltersSnapshot)
      };
    }
  }

  if (!profile && req.tab === 'best-recommendation') {
    const meta = await fetchScholarshipListMeta(supabase, req, defaultBounds, {
      includeCategoryCounts: true,
      skipBestRecommendationSidebarCount: true,
      skipGuestZeroedSidebarCounts: true
    });
    applyListingMetaGuestPatches(meta, { authUser: false });
    return {
      scholarships: [],
      total: 0,
      page: req.page,
      limit: req.limit,
      meta
    };
  }

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

  /** Hub SSR uses public Supabase only; align sidebar with POST `/api/scholarships` for guests. */
  if (!profile && result.meta) {
    applyListingMetaGuestPatches(result.meta, { authUser: false });
  }
  if (profile && result.meta) {
    result.meta.savedFiltersSnapshotJson = profileSavedFiltersSnapshotJson;
  }

  return result;
}

export async function fetchInitialLongTailScholarshipsPayload(
  supabase: ServerSupabaseClient | null,
  mode: LongTailListingMode
): Promise<{
  result: ScholarshipListResult;
  routeScope: LongTailRouteScopePayload;
}> {
  const offlineBounds = {
    amountMin: 0,
    amountMax: 50000,
    applicantsMin: 0,
    applicantsMax: 200000
  } as Awaited<ReturnType<typeof fetchGlobalFilterBounds>>;

  if (!supabase) {
    const moreFilters =
      mode.type === 'legacy'
        ? buildLongTailMoreFiltersState(offlineBounds, mode.slug)
        : buildMoreFiltersForManifestEntry(offlineBounds, mode.entry);
    const slugOnly = buildSeoSlugOnlyMoreFilters(offlineBounds, mode);
    const longTailLegacySlugs =
      mode.type === 'legacy'
        ? [mode.slug]
        : ((mode.entry.legacyBaseSlugs ?? []) as LongTailSlug[]);
    const requiredSeoTags =
      mode.type === 'manifest'
        ? requiredSeoTagsForListingPath(mode.canonicalPath)
        : requiredSeoTagsForListingPath(mode.slug);
    return {
      result: {
        scholarships: [],
        total: 0,
        page: 1,
        limit: SCHOLARSHIPS_PAGE_SIZE
      },
      routeScope: {
        longTailLegacySlugs,
        requiredSeoTags,
        baseMoreFilters: moreFiltersToJson(moreFilters),
        slugOnlyMoreFilters: moreFiltersToJson(slugOnly),
        seoListingFallback: true
      }
    };
  }

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
  providerSlug?: string | null;
};

export async function fetchInitialUniversityHubScholarshipsPayload(
  supabase: ServerSupabaseClient | null,
  providerSlug: string
): Promise<{
  result: ScholarshipListResult;
  routeScope: LongTailRouteScopePayload;
}> {
  const trimmedProviderSlug = providerSlug.trim();
  const offlineBounds = {
    amountMin: 0,
    amountMax: 50000,
    applicantsMin: 0,
    applicantsMax: 200000
  } as Awaited<ReturnType<typeof fetchGlobalFilterBounds>>;

  if (!supabase) {
    return {
      result: {
        scholarships: [],
        total: 0,
        page: 1,
        limit: SCHOLARSHIPS_PAGE_SIZE
      },
      routeScope: {
        longTailLegacySlugs: [],
        requiredSeoTags: [],
        baseMoreFilters: moreFiltersToJson(defaultMoreFiltersFromBounds(offlineBounds)),
        slugOnlyMoreFilters: moreFiltersToJson(defaultMoreFiltersFromBounds(offlineBounds)),
        seoListingFallback: false,
        providerSlug: trimmedProviderSlug
      }
    };
  }

  const bounds = await fetchGlobalFilterBounds(supabase);
  const defaultFilters = defaultMoreFiltersFromBounds(bounds);
  const req = scholarshipListRequestFromParts({
    page: 1,
    limit: SCHOLARSHIPS_PAGE_SIZE,
    sort: 'magic',
    tab: 'matches',
    q: '',
    providerSlug: trimmedProviderSlug,
    category: null,
    categoryPageSlug: null,
    catalogSubjectCategoryId: null,
    deadline: 'any',
    state: null,
    ignored: null,
    saved: null,
    started: null,
    submitted: null,
    moreFilters: defaultFilters,
    longTailLegacySlugs: [],
    similarTo: null,
    similarCategorySlug: null,
    listScope: 'catalog',
    requiredSeoTags: []
  });
  const result = await executeScholarshipListQuery(supabase, req, {
    countOnly: false,
    includeMeta: true,
    includeCategoryCounts: true,
    isProSubscriber: false
  });

  return {
    result,
    routeScope: {
      longTailLegacySlugs: [],
      requiredSeoTags: [],
      baseMoreFilters: moreFiltersToJson(defaultFilters),
      slugOnlyMoreFilters: moreFiltersToJson(defaultFilters),
      seoListingFallback: false,
      providerSlug: trimmedProviderSlug
    }
  };
}

export async function fetchInitialCategoryScholarshipsPayload(
  supabase: ServerSupabaseClient | null,
  categorySlug: string,
  searchParamsString = ''
): Promise<ScholarshipListResult> {
  if (!supabase) {
    return {
      scholarships: [],
      total: 0,
      page: 1,
      limit: SCHOLARSHIPS_PAGE_SIZE
    };
  }
  const bounds = await fetchGlobalFilterBounds(supabase);
  const resolved = await resolveCatalogSubjectCategoryForPageSlug(
    supabase,
    categorySlug
  );
  const searchParams = new URLSearchParams(searchParamsString);
  const req = scholarshipListRequestFromParts({
    page: getSearchParamValue(searchParams, 'page'),
    limit: SCHOLARSHIPS_PAGE_SIZE,
    sort: parseSortFromParam(searchParams.get('sort')),
    tab: 'matches',
    q: getSearchParamValue(searchParams, 'q'),
    category: getSearchParamValue(searchParams, 'category'),
    categoryPageSlug: resolved.legacyCategoryPageSlug,
    catalogSubjectCategoryId: resolved.catalogSubjectCategoryId,
    deadline: parseDeadlineFromParam(searchParams.get('deadline')) ?? 'any',
    state: getSearchParamValue(searchParams, 'state'),
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
