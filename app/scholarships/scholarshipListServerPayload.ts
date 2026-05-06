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
  createDeferredScholarshipListMeta,
  executeScholarshipListQuery,
  executeScholarshipListQueryWithSeoFallback,
  fetchGlobalFilterBounds,
  resolveCatalogSubjectCategoryForPageSlug,
  savedFiltersSnapshotJsonFromProfile,
  scholarshipListRequestFromParts,
  type ScholarshipListResult
} from '@/lib/scholarships/scholarshipListServer';
import {
  parseDeadlineFromParam,
  parseAudienceFromParam,
  parseHubListingBooleanParam,
  parseHubListingCountryCodesParam,
  parseSortFromParam,
  SCHOLARSHIPS_PAGE_SIZE
} from '@/app/scholarships/scholarshipListUrl';
import { parseHubScholarshipTabParam } from '@/app/scholarships/scholarshipTabs';
import type { ProfilesRow } from '@/lib/scholarships/scholarshipMatch';
import type { createClient } from '@/utils/supabase/server';
import type { ScholarshipCountrySeoRoute } from '@/app/scholarships/scholarshipCountrySeo';
import type { CrossCountryManifestEntry } from '@/lib/scholarships/seoCrossCountryManifest';
import {
  moreFiltersFromJson,
  moreFiltersToJson,
  type MoreFiltersJson
} from '@/lib/scholarships/scholarshipListApiCodec';
import { stripHubProfileHardMatchMoreFilters } from '@/lib/scholarships/profileFilterDefaults';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';
type ServerSupabaseClient = SupabaseClient<Database>;

export { buildInitialListRequestKey } from '@/app/scholarships/buildInitialListRequestKey';

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
  const appCc = parseHubListingCountryCodesParam(searchParams.get('app_cc'));
  const hostCc = parseHubListingCountryCodesParam(searchParams.get('host_cc'));
  const hostUnspecified = parseHubListingBooleanParam(
    searchParams.get('host_unspecified')
  );
  const moreFilters = defaultMoreFiltersFromBounds(defaultBounds);
  moreFilters.includeUnspecifiedHostCountries = hostUnspecified;
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
    moreFilters,
    appCountryCodesFromUrl: appCc.length > 0 ? appCc : null,
    hostCountryCodesFromUrl: hostCc.length > 0 ? hostCc : null,
    longTailLegacySlugs: [],
    similarTo: null,
    similarCategorySlug: null,
    listScope: 'catalog',
    requiredSeoTags: []
  });
  const audience = parseAudienceFromParam(searchParams.get('aud'));
  if (audience !== 'any') {
    req = {
      ...req,
      moreFilters: {
        ...req.moreFilters,
        citizenshipAudience: audience
      }
    };
  }
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
    try {
      const meta = createDeferredScholarshipListMeta(req, defaultBounds);
      applyListingMetaGuestPatches(meta, { authUser: false });
      return {
        scholarships: [],
        total: 0,
        page: req.page,
        limit: req.limit,
        meta
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console -- keep SSR hub rendering alive on meta failures
      console.error('[fetchInitialHubScholarshipsPayload] guest best meta failed', {
        tab: req.tab,
        message
      });
      return {
        scholarships: [],
        total: 0,
        page: req.page,
        limit: req.limit,
        errorMessage: `Scholarship meta failed during initial load: ${message}`
      };
    }
  }

  let result: ScholarshipListResult;
  try {
    result = await executeScholarshipListQuery(
      supabase,
      profile ? { ...req, personalizedProfile: profile } : req,
      {
        countOnly: false,
        includeMeta: false,
        includeCategoryCounts: false,
        isProSubscriber: false
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console -- keep SSR hub rendering alive on list failures
    console.error('[fetchInitialHubScholarshipsPayload] initial query failed', {
      tab: req.tab,
      message
    });
    return {
      scholarships: [],
      total: 0,
      page: req.page,
      limit: req.limit,
      errorMessage: `Scholarship list failed during initial load: ${message}`
    };
  }

  /** Hub SSR uses public Supabase only; align sidebar with POST `/api/scholarships` for guests. */
  const metaReq = profile ? { ...req, personalizedProfile: profile } : req;
  result.meta = createDeferredScholarshipListMeta(metaReq, defaultBounds);
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

export async function fetchInitialCountryScholarshipsPayload(
  supabase: ServerSupabaseClient | null,
  route: ScholarshipCountrySeoRoute
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

  const makeMoreFilters = (
    bounds: Awaited<ReturnType<typeof fetchGlobalFilterBounds>>
  ) => {
    const moreFilters = defaultMoreFiltersFromBounds(bounds);
    if (route.kind === 'applicant') {
      moreFilters.includeApplicantCountryCodes.add(route.code);
    }
    return moreFilters;
  };

  if (!supabase) {
    const moreFilters = makeMoreFilters(offlineBounds);
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
        baseMoreFilters: moreFiltersToJson(moreFilters),
        slugOnlyMoreFilters: moreFiltersToJson(moreFilters),
        seoListingFallback: false,
        hostCountryCodes: route.kind === 'host' ? [route.code] : []
      }
    };
  }

  const bounds = await fetchGlobalFilterBounds(supabase);
  const moreFilters = makeMoreFilters(bounds);
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
    hostCountryCodesFromUrl: route.kind === 'host' ? [route.code] : null,
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
      baseMoreFilters: moreFiltersToJson(moreFilters),
      slugOnlyMoreFilters: moreFiltersToJson(moreFilters),
      seoListingFallback: false,
      hostCountryCodes: route.kind === 'host' ? [route.code] : []
    }
  };
}

/** Cross-country SEO: applicant country (More filters) + study host (`host_cc` scope), same query path as country SEO. */
export async function fetchInitialCrossCountryScholarshipsPayload(
  supabase: ServerSupabaseClient | null,
  entry: CrossCountryManifestEntry
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

  const makeMoreFilters = (
    bounds: Awaited<ReturnType<typeof fetchGlobalFilterBounds>>
  ) => {
    const moreFilters = defaultMoreFiltersFromBounds(bounds);
    moreFilters.includeApplicantCountryCodes.add(
      entry.applicantCode.trim().toUpperCase()
    );
    return moreFilters;
  };

  if (!supabase) {
    const moreFilters = makeMoreFilters(offlineBounds);
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
        baseMoreFilters: moreFiltersToJson(moreFilters),
        slugOnlyMoreFilters: moreFiltersToJson(moreFilters),
        seoListingFallback: false,
        hostCountryCodes: [entry.hostCode.trim().toUpperCase()]
      }
    };
  }

  const bounds = await fetchGlobalFilterBounds(supabase);
  const moreFilters = makeMoreFilters(bounds);
  const hostCode = entry.hostCode.trim().toUpperCase();
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
    hostCountryCodesFromUrl: [hostCode],
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
      baseMoreFilters: moreFiltersToJson(moreFilters),
      slugOnlyMoreFilters: moreFiltersToJson(moreFilters),
      seoListingFallback: false,
      hostCountryCodes: [hostCode]
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
  hostCountryCodes?: string[];
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
