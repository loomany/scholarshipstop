import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createPublicClient } from '@/utils/supabase/public';
import {
  parseDeadlineFromParam,
  parseHubListingBooleanParam,
  parseHubListingCountryCodesParam,
  parseSortFromParam,
  SCHOLARSHIPS_PAGE_SIZE
} from '@/app/scholarships/scholarshipListUrl';
import { defaultMoreFiltersFromBounds } from '@/app/scholarships/moreFilters';
import {
  parseHubScholarshipTabParam,
  parseScholarshipTabParam
} from '@/app/scholarships/scholarshipTabs';
import {
  applyCatalogOnlyListingNormalization,
  executeScholarshipListQuery,
  executeScholarshipListQueryWithSeoFallback,
  fetchGlobalFilterBounds,
  fetchScholarshipListMeta,
  resolveCatalogSubjectCategoryForPageSlug,
  savedFiltersSnapshotJsonFromProfile,
  scholarshipListRequestFromParts,
  type ScholarshipListMeta,
  type ScholarshipListResult,
  type ScholarshipListRequest
} from '@/lib/scholarships/scholarshipListServer';
import type { Database } from '@/types_db';
import { applyListingMetaGuestPatches } from '@/lib/scholarships/applyListingMetaGuestPatches';
import { profileMatchSummaryFromRow } from '@/lib/scholarships/profileMatchMeta';
import {
  buildScholarshipProfileFilterSeed,
  stripHubProfileHardMatchMoreFilters
} from '@/lib/scholarships/profileFilterDefaults';
import { getSubscription } from '@/utils/supabase/queries';
import { hasActiveSubscriptionAccess } from '@/lib/payments/subscriptionEntitlements';
import {
  moreFiltersFromJson,
  moreFiltersToJson,
  type MoreFiltersJson
} from '@/lib/scholarships/scholarshipListApiCodec';
import {
  PUBLIC_LIST_CARD_SELECT,
  mapScholarshipRow,
  type ScholarshipRow
} from '@/lib/scholarships/supabase';
import { applyV2ReadPathToLegacyRequest } from '@/lib/scholarships-v2/runtime/applyV2ReadPathToLegacyRequest';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

export const dynamic = 'force-dynamic';

function scholarshipsV2ReadPathEnabled(): boolean {
  return process.env.SCHOLARSHIPS_V2_READ_PATH === '1';
}

type RuntimeReadPath = 'legacy' | 'v2-bridge';

function withRuntimePathDebugHeaders(
  response: NextResponse,
  searchParams: URLSearchParams,
  runtimeReadPath: RuntimeReadPath,
  v2Eligible: boolean
): NextResponse {
  if (searchParams.get('debug_read_path') !== '1') return response;

  response.headers.set('X-Scholarships-Read-Path', runtimeReadPath);
  response.headers.set('X-Scholarships-V2-Flag', scholarshipsV2ReadPathEnabled() ? '1' : '0');
  response.headers.set('X-Scholarships-V2-Eligible', v2Eligible ? '1' : '0');

  return response;
}
/** Temporary: hub sidebar personalized counts (best/recommended) SSR vs client refresh. Remove after diagnosis. */
function hubSidebarMetaDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.SCHOLARSHIPS_HUB_SIDEBAR_DEBUG === '1'
  );
}

function scholarshipsApiTimingDebugEnabled(): boolean {
  return process.env.SCHOLARSHIPS_API_TIMING_DEBUG === '1';
}

/**
 * Request-scoped profile read for personalized scholarships paths.
 * Keep this outside unstable_cache to avoid dynamic cookies() within cached closures.
 */
async function loadProfileForScholarshipsList(
  userId: string,
  requestSupabase: any
): Promise<ProfilesRow | null> {
  const selectProfile = async (client: any): Promise<ProfilesRow | null> => {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  };

  try {
    return await selectProfile(requestSupabase);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[scholarships api] profile cache path failed, direct read', {
      userId,
      message: e instanceof Error ? e.message : String(e)
    });
    return selectProfile(requestSupabase);
  }
}

async function emptyListResult(
  req: ScholarshipListRequest,
  includeMeta: boolean,
  authUser: boolean,
  keepBestRecommendationCount: boolean,
  /** Listing/meta queries: public client for guests (no cookies), cookie client when session exists. */
  listDb: NonNullable<ReturnType<typeof createPublicClient>>
) {
  let meta: ScholarshipListMeta | undefined = undefined;
  if (includeMeta) {
    const bounds = await fetchGlobalFilterBounds(listDb);
    meta = await fetchScholarshipListMeta(listDb, req, bounds, {
      skipBestRecommendationSidebarCount: !authUser && !keepBestRecommendationCount,
      skipGuestZeroedSidebarCounts: !authUser
    });
    applyListingMetaGuestPatches(meta, {
      authUser,
      keepBestRecommendationCount
    });
  }
  return {
    scholarships: [],
    total: 0,
    page: req.page,
    limit: req.limit,
    meta
  };
}

function isEmptyIdTab(req: ScholarshipListRequest): boolean {
  switch (req.tab) {
    case 'saved':
      return req.saved.length === 0;
    case 'ignored':
      return req.ignored.length === 0;
    case 'started':
      return req.started.length === 0;
    case 'submitted':
      return req.submitted.length === 0;
    default:
      return false;
  }
}

type SeoListBodyOpts = {
  seoListingFallback?: boolean;
  slugOnlyMoreFilters?: MoreFiltersJson;
  /** Manifest / long-tail SEO: canonical `seo_tags` AND filter (allowlisted server-side). */
  requiredSeoTags?: string[];
  /** Clean SEO routes can own host-country filters without exposing `host_cc` query. */
  hostCountryCodes?: string[];
  /** Guest Best: transient quiz hosts (not hub `host_cc`) — cleared on SQL relax retries. */
  bestRecommendationRelaxableQuizHostCountries?: boolean;
};

function buildGuestPublicCacheControl(args: {
  authUser: boolean;
  isHubPrimaryListing: boolean;
  includeMeta: boolean;
  countOnly: boolean;
  metaOnly: boolean;
  req: ScholarshipListRequest;
  bounds: ScholarshipListMeta['filterBounds'];
}): string | null {
  if (args.authUser) return null;
  if (!args.isHubPrimaryListing) return null;
  if (args.countOnly || args.includeMeta || args.metaOnly) return null;
  if (args.req.page !== 1 || args.req.limit !== SCHOLARSHIPS_PAGE_SIZE) return null;
  if (args.req.tab !== 'matches' && args.req.tab !== 'easy-apply') return null;
  if (args.req.q.trim().length > 0) return null;
  if (args.req.categoryIds.size > 0) return null;
  if (args.req.categoryPageSlug || args.req.catalogSubjectCategoryId) return null;
  if (args.req.stateCodes.length > 0) return null;
  if (args.req.hostCountryCodesFilter.length > 0) return null;
  if (args.req.longTailLegacySlugs.length > 0) return null;
  if (args.req.providerSlug) return null;
  if (args.req.similarToId) return null;
  if (args.req.saved.length > 0) return null;
  if (args.req.ignored.length > 0) return null;
  if (args.req.started.length > 0) return null;
  if (args.req.submitted.length > 0) return null;
  if (args.req.requiredSeoTags.length > 0) return null;
  if (args.req.deadline !== 'any') return null;
  if (args.req.tab === 'easy-apply') {
    const defaultFilters = defaultMoreFiltersFromBounds(args.bounds);
    const defaultJson = JSON.stringify(moreFiltersToJson(defaultFilters));
    defaultFilters.includeEasyApply.add('easy_apply');
    const easyApplyJson = JSON.stringify(moreFiltersToJson(defaultFilters));
    const requestJson = JSON.stringify(moreFiltersToJson(args.req.moreFilters));
    if (requestJson !== defaultJson && requestJson !== easyApplyJson) return null;
  }
  return 'public, s-maxage=45, stale-while-revalidate=300';
}

async function handleList(
  searchParams: URLSearchParams,
  bodyMoreFilters: MoreFiltersJson | undefined,
  bodyLongTail: string[] | undefined,
  seoBody?: SeoListBodyOpts,
  /** Hub: optional saved-filter snapshot for `recommended` sidebar count (`null` = none saved). */
  savedFiltersSnapshotBody?: MoreFiltersJson | null,
  providerSlugBody?: string | null,
  guestBestRecommendationPreviewEnabled = false,
  sidebarOnlyMeta = false
) {
  const cookieSupabase = createClient() as any;
  const publicSupabase = createPublicClient() as any;
  const {
    data: { user: sessionUser }
  } = await cookieSupabase.auth.getUser();
  /** Guest catalog reads skip cookie-bound client so PostgREST can align with cacheable anonymous paths. */
  const listingSupabase = sessionUser ? cookieSupabase : publicSupabase;

  if (!listingSupabase) {
    return NextResponse.json(
      {
        error:
          'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      },
      { status: 503 }
    );
  }

  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  const sort = parseSortFromParam(searchParams.get('sort'));
  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category');
  const categoryPageParam =
    searchParams.get('category_page') ?? searchParams.get('category_slug');
  const deadline =
    parseDeadlineFromParam(searchParams.get('deadline')) ?? 'any';
  const state = searchParams.get('state');
  const ignored = searchParams.get('ignored');
  const saved = searchParams.get('saved');
  const started = searchParams.get('started');
  const submitted = searchParams.get('submitted');
  const countOnly = searchParams.get('count_only') === '1';
  const includeMeta = searchParams.get('meta') === '1';
  const metaOnly = searchParams.get('meta_only') === '1';
  const similarTo = searchParams.get('similar_to');
  const similarCategorySlug = searchParams.get('similar_category_slug');
  const similarStateSlug = searchParams.get('similar_state_slug');
  const listScope = searchParams.get('scope');
  const appCountryCodesFromUrl = parseHubListingCountryCodesParam(
    searchParams.get('app_cc')
  );
  const hostCountryCodesFromUrl = parseHubListingCountryCodesParam(
    searchParams.get('host_cc')
  );
  const hostUnspecifiedFromUrl = parseHubListingBooleanParam(
    searchParams.get('host_unspecified')
  );
  const hostCountryCodesFromBody = Array.isArray(seoBody?.hostCountryCodes)
    ? seoBody.hostCountryCodes
    : [];

  const bounds = await fetchGlobalFilterBounds(listingSupabase);
  const moreFilters = moreFiltersFromJson(
    bodyMoreFilters,
    bounds
  );
  const audienceParam =
    searchParams.get('aud') ?? searchParams.get('audience');
  if (
    audienceParam === 'international_friendly' &&
    moreFilters.citizenshipAudience === 'any'
  ) {
    moreFilters.citizenshipAudience = 'international_friendly';
  }
  if (hostUnspecifiedFromUrl) {
    moreFilters.includeUnspecifiedHostCountries = true;
  }

  const lt =
    bodyLongTail ??
    (searchParams.get('long_tail')?.split(',').map((s) => s.trim()) ?? []);

  const anonymousCatalogFastPath =
    !seoBody?.seoListingFallback &&
    !similarTo?.trim() &&
    !(categoryPageParam?.trim()) &&
    lt.filter(Boolean).length === 0 &&
    !(saved?.trim()) &&
    !(ignored?.trim()) &&
    !(started?.trim()) &&
    !(submitted?.trim()) &&
    !seoBody?.requiredSeoTags?.length;

  const isHubPrimaryListing =
    !(categoryPageParam?.trim()) &&
    lt.filter(Boolean).length === 0 &&
    !(similarTo?.trim());
  const includeCategoryCounts =
    !sidebarOnlyMeta &&
    (Boolean(isHubPrimaryListing) ||
      !anonymousCatalogFastPath ||
      Boolean(categoryPageParam?.trim()));

  const tab = isHubPrimaryListing
    ? parseHubScholarshipTabParam(searchParams.get('tab'))
    : parseScholarshipTabParam(searchParams.get('tab'));

  const { legacyCategoryPageSlug, catalogSubjectCategoryId } =
    await resolveCatalogSubjectCategoryForPageSlug(
      listingSupabase,
      categoryPageParam
    );

  let req: ScholarshipListRequest = applyCatalogOnlyListingNormalization(
    scholarshipListRequestFromParts({
      page,
      limit,
      sort,
      tab,
      q,
      providerSlug: providerSlugBody,
      category,
      categoryPageSlug: legacyCategoryPageSlug,
      catalogSubjectCategoryId,
      deadline,
      state,
      ignored,
      saved,
      started,
      submitted,
      moreFilters,
      appCountryCodesFromUrl:
        appCountryCodesFromUrl.length > 0 ? appCountryCodesFromUrl : null,
      hostCountryCodesFromUrl:
        hostCountryCodesFromUrl.length > 0 || hostCountryCodesFromBody.length > 0
          ? [...hostCountryCodesFromUrl, ...hostCountryCodesFromBody]
          : null,
      bestRecommendationRelaxableQuizHostCountries:
        seoBody?.bestRecommendationRelaxableQuizHostCountries === true,
      longTailLegacySlugs: lt.filter(Boolean),
      similarTo,
      similarCategorySlug,
      similarStateSlug,
      listScope,
      requiredSeoTags: seoBody?.requiredSeoTags
    })
  );

  if (hostCountryCodesFromUrl.length > 0) {
    req = {
      ...req,
      bestRecommendationRelaxableQuizHostCountries: false
    };
  }

  if (savedFiltersSnapshotBody !== undefined) {
    req = {
      ...req,
      savedFiltersSnapshot:
        savedFiltersSnapshotBody == null
          ? null
          : moreFiltersFromJson(savedFiltersSnapshotBody, bounds)
    };
  }

  const v2ReadPathEligible =
    scholarshipsV2ReadPathEnabled() &&
    !similarTo?.trim() &&
    !seoBody?.seoListingFallback &&
    !metaOnly &&
    !countOnly;
  let runtimeReadPath: RuntimeReadPath = 'legacy';

  if (v2ReadPathEligible) {
    req = applyV2ReadPathToLegacyRequest({
      request: req,
      searchParams,
      moreFilters: bodyMoreFilters
    });

  }

  const hubDebugReqId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const hubDbg = hubSidebarMetaDebugEnabled() && isHubPrimaryListing;
  const apiTimingDebug = scholarshipsApiTimingDebugEnabled();
  const requestStartedAt = performance.now();
  const logApiTiming = (
    phase: string,
    extra: Record<string, unknown> = {}
  ) => {
    if (!apiTimingDebug) return;
    // eslint-disable-next-line no-console -- opt-in production performance diagnostics
    console.log('[scholarships-api-timing]', {
      reqId: hubDebugReqId,
      phase,
      elapsedMs: Math.round(performance.now() - requestStartedAt),
      tab: req.tab,
      scope: req.listScope,
      metaOnly,
      sidebarOnlyMeta,
      countOnly,
      includeMeta,
      includeCategoryCounts,
      authUser: Boolean(authUser),
      ...extra
    });
  };

  let authUser: { id?: string } | null = sessionUser;
  let profileRow: ProfilesRow | null = null;
  let isProSubscriber = false;
  let profileFilterSeed = null as ReturnType<typeof buildScholarshipProfileFilterSeed>;
  let authBlockMs: number | undefined;
  /**
   * Load auth/profile only when the response actually needs personalized context.
   * Session is resolved once via `cookieSupabase` so listing can use `publicSupabase` for guests.
   */
  const requiresPersonalizationContext =
    includeMeta ||
    metaOnly ||
    req.listScope === 'personalized' ||
    req.tab === 'best-recommendation' ||
    req.tab === 'recommended' ||
    req.tab === 'hot-deadlines' ||
    req.saved.length > 0 ||
    req.ignored.length > 0 ||
    req.started.length > 0 ||
    req.submitted.length > 0;
  const shouldLoadAuthAndProfile = requiresPersonalizationContext;

  if (hubDbg) {
    // eslint-disable-next-line no-console -- temporary hub sidebar diagnosis
    console.log('[scholarships-hub-meta-debug] api before auth/match', {
      reqId: hubDebugReqId,
      ts: new Date().toISOString(),
      reqTab: req.tab,
      reqListScope: req.listScope,
      anonymousCatalogFastPath,
      isHubPrimaryListing,
      shouldLoadAuthAndProfile,
      countOnly,
      includeMeta,
      metaOnly,
      sidebarOnlyMeta,
      includeCategoryCounts,
      category_page: Boolean(categoryPageParam?.trim()),
      long_tail: lt.filter(Boolean).length > 0,
      similar_to: Boolean(similarTo?.trim()),
      rawScopeParam: listScope,
      rawTabParam: searchParams.get('tab')
    });
  }

  if (shouldLoadAuthAndProfile && sessionUser?.id) {
    const tAuth0 = performance.now();
    authUser = sessionUser;
    const [prof, subscription] = await Promise.all([
      loadProfileForScholarshipsList(sessionUser.id, cookieSupabase),
      getSubscription(sessionUser.id)
    ]);
    profileRow = prof;
    profileFilterSeed = buildScholarshipProfileFilterSeed(prof);
    isProSubscriber = hasActiveSubscriptionAccess(prof, subscription);
    authBlockMs = performance.now() - tAuth0;
  }

  if (
    process.env.NODE_ENV === 'development' &&
    shouldLoadAuthAndProfile &&
    sessionUser?.id
  ) {
    // eslint-disable-next-line no-console -- list/meta auth timing
    console.log('[scholarships api] profile+subscription block', {
      reqId: hubDebugReqId,
      authBlockMs: authBlockMs ?? null,
      metaOnly,
      sidebarOnlyMeta,
      includeCategoryCounts,
      tab: req.tab
    });
  }
  const profileSavedFiltersSnapshotJson =
    savedFiltersSnapshotJsonFromProfile(profileRow);
  const profileSavedFiltersSnapshot =
    profileSavedFiltersSnapshotJson == null
      ? null
      : moreFiltersFromJson(profileSavedFiltersSnapshotJson, bounds);
  if (profileRow) {
    req = { ...req, personalizedProfile: profileRow };
  }
  if (profileRow && req.savedFiltersSnapshot === undefined) {
    req = {
      ...req,
      savedFiltersSnapshot: profileSavedFiltersSnapshot
    };
  }
  if (
    req.tab === 'recommended' &&
    bodyMoreFilters === undefined &&
    profileSavedFiltersSnapshot != null
  ) {
    req = {
      ...req,
      moreFilters: stripHubProfileHardMatchMoreFilters(profileSavedFiltersSnapshot)
    };
  }

  if (req.tab === 'recommended') {
    req = {
      ...req,
      moreFilters: stripHubProfileHardMatchMoreFilters(req.moreFilters)
    };
  }
  const guestBestHasExplicitCountryFilter =
    !authUser &&
    req.tab === 'best-recommendation' &&
    (req.moreFilters.includeApplicantCountryCodes.size > 0 ||
      req.moreFilters.includeUnspecifiedApplicantCountries);
  const guestBestRecommendationPreviewAllowed =
    guestBestRecommendationPreviewEnabled || guestBestHasExplicitCountryFilter;

  if (hubDbg) {
    // eslint-disable-next-line no-console -- temporary hub sidebar diagnosis
    console.log('[scholarships-hub-meta-debug] api after auth/profile', {
      reqId: hubDebugReqId,
      ts: new Date().toISOString(),
      authBlockMs: authBlockMs ?? null,
      metaOnly,
      sidebarOnlyMeta,
      includeCategoryCounts,
      authUserId: authUser?.id ?? null,
      profileExists: profileRow != null
    });
  }

  if (metaOnly) {
    let meta: ScholarshipListMeta;
    const metaStartedAt = performance.now();
    try {
      meta = await fetchScholarshipListMeta(listingSupabase, req, bounds, {
        includeCategoryCounts,
        skipBestRecommendationSidebarCount:
          !authUser && !guestBestRecommendationPreviewAllowed,
        skipGuestZeroedSidebarCounts: !authUser
      });
      logApiTiming('meta-query', {
        queryMs: Math.round(performance.now() - metaStartedAt)
      });
    } catch (error) {
      logApiTiming('meta-query-error', {
        queryMs: Math.round(performance.now() - metaStartedAt)
      });
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Scholarship meta query failed for tab "${req.tab}": ${message}`);
    }
    if (profileRow) {
      meta.profileMatchSummary = profileMatchSummaryFromRow(profileRow);
      meta.profileFilterSeed = profileFilterSeed;
      meta.savedFiltersSnapshotJson = profileSavedFiltersSnapshotJson;
    } else if (profileFilterSeed) {
      meta.profileFilterSeed = profileFilterSeed;
    }
    applyListingMetaGuestPatches(meta, {
      authUser: Boolean(authUser),
      keepBestRecommendationCount:
        !authUser && guestBestRecommendationPreviewAllowed
    });
    const response = NextResponse.json({
      meta,
      page: req.page,
      limit: req.limit
    });
    response.headers.set('Cache-Control', 'private, no-store');
    return withRuntimePathDebugHeaders(response, searchParams, runtimeReadPath, v2ReadPathEligible);
  }

  if (!similarTo && isEmptyIdTab(req)) {
    const r = await emptyListResult(
      req,
      includeMeta && !countOnly,
      Boolean(sessionUser),
      false,
      listingSupabase
    );
    if (hubDbg) {
      // eslint-disable-next-line no-console -- temporary hub sidebar diagnosis
      console.log('[scholarships-hub-meta-debug] api early emptyIdTab branch', {
        reqId: hubDebugReqId,
        tab: req.tab,
        metaBest: r.meta?.sidebarCounts.bestRecommendation,
        metaRec: r.meta?.sidebarCounts.recommended
      });
    }
    if (countOnly) {
      return withRuntimePathDebugHeaders(
        NextResponse.json({ total: 0, page: req.page, limit: req.limit }),
        searchParams,
        runtimeReadPath,
        v2ReadPathEligible
      );
    }
    return withRuntimePathDebugHeaders(
      NextResponse.json({
        scholarships: r.scholarships,
        total: 0,
        page: req.page,
        limit: req.limit,
        meta: r.meta
      }),
      searchParams,
      runtimeReadPath,
      v2ReadPathEligible
    );
  }

  if (
    !similarTo &&
    !authUser &&
    req.tab === 'best-recommendation' &&
    !guestBestRecommendationPreviewAllowed
  ) {
    const r = await emptyListResult(
      req,
      includeMeta && !countOnly,
      false,
      false,
      listingSupabase
    );
    if (countOnly) {
      return withRuntimePathDebugHeaders(
        NextResponse.json({ total: 0, page: req.page, limit: req.limit }),
        searchParams,
        runtimeReadPath,
        v2ReadPathEligible
      );
    }
    return withRuntimePathDebugHeaders(
      NextResponse.json({
        scholarships: [],
        results: [],
        total: 0,
        page: req.page,
        limit: req.limit,
        meta: r.meta,
        isProSubscriber
      }),
      searchParams,
      runtimeReadPath,
      v2ReadPathEligible
    );
  }

  const slugOnlyMf =
    seoBody?.slugOnlyMoreFilters != null
      ? moreFiltersFromJson(seoBody.slugOnlyMoreFilters, bounds)
      : null;

  /**
   * SEO listing POST sends `seoListingFallback` for long-tail + manifest + category pages.
   * Manifest-only rows often have `legacyBaseSlugs: []` but non-empty merged moreFilters —
   * fallback must still run (relax filters), so we do NOT require long_tail slugs here.
   */
  const seoFallbackEnabled =
    Boolean(seoBody?.seoListingFallback) &&
    req.tab === 'matches' &&
    !req.similarToId;

  /**
   * Temporary: `SEO_SQL_DEBUG_BYPASS=1` — ignore moreFilters / fallback chain;
   * returns first 10 active rows (card select) to verify DB + RLS vs filter stack.
   */
  if (
    process.env.SEO_SQL_DEBUG_BYPASS === '1' &&
    seoFallbackEnabled &&
    !countOnly
  ) {
    // eslint-disable-next-line no-console -- SEO SQL debug
    console.log('[SEO_SQL_DEBUG_BYPASS] active: is_active=true, limit 10, no moreFilters');
    const { data, error, count } = await listingSupabase
      .from('scholarships_safe_listing')
      .select(PUBLIC_LIST_CARD_SELECT, { count: 'exact' })
      .eq('is_active', true)
      .limit(10);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as ScholarshipRow[];
    const scholarships = rows.map((r) => mapScholarshipRow(r));
    const total = count ?? scholarships.length;
    // eslint-disable-next-line no-console -- SEO SQL debug
    console.log('SEO SQL RESULT (bypass)', { rows: scholarships.length, total });
    return NextResponse.json({
      scholarships,
      results: scholarships,
      total,
      page: 1,
      limit: req.limit,
      isProSubscriber,
      seoFallback: {
        used: true,
        tier: 999,
        exactTotal: -1,
        thinListing: false
      },
      seoSqlDebugBypass: true
    });
  }

  if (seoFallbackEnabled && !countOnly) {
    // eslint-disable-next-line no-console -- temporary SEO list diagnostics
    console.log('SEO FINAL REQUEST', {
      moreFilters: moreFiltersToJson(req.moreFilters),
      longTailLegacySlugs: req.longTailLegacySlugs,
      categoryPageSlug: req.categoryPageSlug,
      catalogSubjectCategoryId: req.catalogSubjectCategoryId
    });
    // eslint-disable-next-line no-console -- temporary SEO list diagnostics
    console.log(
      'SEO FILTER DEBUG',
      JSON.stringify(moreFiltersToJson(req.moreFilters), null, 2)
    );
  }

  let result: ScholarshipListResult;
  const listStartedAt = performance.now();
  try {
    result = seoFallbackEnabled
      ? await executeScholarshipListQueryWithSeoFallback(
          listingSupabase,
          req,
          {
            countOnly,
            includeMeta: includeMeta && !countOnly,
            includeCategoryCounts,
            isProSubscriber
          },
          {
            enable: true,
            slugOnlyMoreFilters: slugOnlyMf,
            bounds,
            isCategorySeo: Boolean(
              req.categoryPageSlug?.trim() || req.catalogSubjectCategoryId
            )
          }
        )
      : await executeScholarshipListQuery(listingSupabase, req, {
          countOnly,
          includeMeta: includeMeta && !countOnly,
          includeCategoryCounts,
          isProSubscriber
        });
    logApiTiming('list-query', {
      queryMs: Math.round(performance.now() - listStartedAt),
      rows: result.scholarships?.length ?? 0,
      total: result.total,
      seoFallbackUsed: Boolean(result.seoFallback?.used)
    });
  } catch (error) {
    logApiTiming('list-query-error', {
      queryMs: Math.round(performance.now() - listStartedAt),
      seoFallbackEnabled
    });
    const message = error instanceof Error ? error.message : String(error);
    const phase = countOnly ? 'count' : includeMeta ? 'list+meta' : 'list';
    throw new Error(`Scholarship ${phase} query failed for tab "${req.tab}": ${message}`);
  }

  if (seoFallbackEnabled && !countOnly) {
    // eslint-disable-next-line no-console -- temporary SEO list diagnostics
    console.log('SEO SQL RESULT', {
      rows: result.scholarships?.length ?? 0,
      total: result.total
    });
  }

  if (result.meta && profileRow) {
    result.meta.profileMatchSummary = profileMatchSummaryFromRow(profileRow);
    result.meta.profileFilterSeed = profileFilterSeed;
    result.meta.savedFiltersSnapshotJson = profileSavedFiltersSnapshotJson;
  } else if (result.meta && profileFilterSeed) {
    result.meta.profileFilterSeed = profileFilterSeed;
  }
  if (hubDbg && result.meta && !countOnly) {
    // eslint-disable-next-line no-console -- temporary hub sidebar diagnosis
    console.log('[scholarships-hub-meta-debug] api before applyListingMetaGuestPatches', {
      reqId: hubDebugReqId,
      ts: new Date().toISOString(),
      sidebarMatches: result.meta.sidebarCounts.matches
    });
  }
  if (result.meta) {
    applyListingMetaGuestPatches(result.meta, {
      authUser: Boolean(authUser),
      keepBestRecommendationCount:
        !authUser && guestBestRecommendationPreviewAllowed
    });
  }
  if (hubDbg && result.meta && !countOnly) {
    // eslint-disable-next-line no-console -- temporary hub sidebar diagnosis
    console.log('[scholarships-hub-meta-debug] api after applyListingMetaGuestPatches', {
      reqId: hubDebugReqId,
      ts: new Date().toISOString(),
      authUser: Boolean(authUser),
      sidebarMatches: result.meta.sidebarCounts.matches
    });
  }

  if (countOnly) {
    // eslint-disable-next-line no-console -- temporary SEO list diagnostics
    console.log('SEO DEBUG RESPONSE', {
      countOnly: true,
      resultsLength: 0,
      total: result.total,
      fallbackUsed: result.seoFallback?.used,
      tier: result.seoFallback?.tier
    });
    return withRuntimePathDebugHeaders(
      NextResponse.json({
        total: result.total,
        page: req.page,
        limit: req.limit,
        seoFallback: result.seoFallback
      }),
      searchParams,
      runtimeReadPath,
      v2ReadPathEligible
    );
  }

  const response = NextResponse.json({
    scholarships: result.scholarships,
    /** Alias for clients expecting `results` (SEO fallback debugging). */
    results: result.scholarships,
    total: result.total,
    page: result.page,
    limit: result.limit,
    meta: result.meta,
    errorMessage: result.errorMessage,
    matchPaywall: result.matchPaywall,
    isProSubscriber,
    seoFallback: result.seoFallback
  });
  const cacheControl = buildGuestPublicCacheControl({
    authUser: Boolean(authUser),
    isHubPrimaryListing,
    includeMeta,
    countOnly,
    metaOnly,
    req,
    bounds
  });
  if (cacheControl) {
    response.headers.set('Cache-Control', cacheControl);
    response.headers.set('Vary', 'Accept-Encoding');
  } else {
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return withRuntimePathDebugHeaders(response, searchParams, runtimeReadPath, v2ReadPathEligible);
}

/** GET /api/scholarships?page=&limit=&sort=&tab=&q=&category=&deadline=&state=&ignored=&saved=&…&meta=1&count_only=1&similar_to=&long_tail= */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let bodyMore: MoreFiltersJson | undefined;
    const mf = searchParams.get('mf');
    if (mf) {
      try {
        bodyMore = JSON.parse(mf) as MoreFiltersJson;
      } catch {
        return NextResponse.json({ error: 'Invalid mf JSON' }, { status: 400 });
      }
    }
    const lt = searchParams.get('long_tail')?.split(',').map((s) => s.trim());
    return await handleList(
      searchParams,
      bodyMore,
      lt,
      undefined,
      undefined,
      undefined,
      false
    );
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    // eslint-disable-next-line no-console -- API diagnostics
    console.error('[scholarships api] GET error', {
      url: request.url,
      message: err.message,
      stack: err.stack
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/scholarships
 * Body: { searchParams?: string, moreFilters?: MoreFiltersJson, longTailLegacySlugs?: string[] }
 */
export async function POST(request: Request) {
  let bodySnapshot: Record<string, unknown> | undefined;
  try {
    bodySnapshot = (await request.json()) as Record<string, unknown>;
    const json = bodySnapshot as {
      searchParams?: string;
      moreFilters?: MoreFiltersJson;
      longTailLegacySlugs?: string[];
      seoListingFallback?: boolean;
      slugOnlyMoreFilters?: MoreFiltersJson;
      requiredSeoTags?: string[];
      providerSlug?: string | null;
      hostCountryCodes?: string[];
      bestRecommendationRelaxableQuizHostCountries?: boolean;
      /** `null` = client has no saved filter preset (Saved Filters count = 0). */
      savedFiltersSnapshot?: MoreFiltersJson | null;
      guestBestRecommendationPreviewEnabled?: boolean;
      sidebarOnlyMeta?: boolean;
    };
    // eslint-disable-next-line no-console -- API diagnostics (SEO listing debugging)
    console.log('[scholarships api] POST body snapshot', {
      keys: Object.keys(json),
      requiredSeoTags: json.requiredSeoTags,
      seoListingFallback: json.seoListingFallback,
      longTailLegacySlugs: json.longTailLegacySlugs,
      providerSlug: json.providerSlug,
      sidebarOnlyMeta: json.sidebarOnlyMeta === true
    });
    const sp = new URLSearchParams(json.searchParams ?? '');
    return await handleList(sp, json.moreFilters, json.longTailLegacySlugs, {
      seoListingFallback: json.seoListingFallback,
      slugOnlyMoreFilters: json.slugOnlyMoreFilters,
      requiredSeoTags: json.requiredSeoTags,
      hostCountryCodes: json.hostCountryCodes,
      bestRecommendationRelaxableQuizHostCountries:
        json.bestRecommendationRelaxableQuizHostCountries === true
    }, json.savedFiltersSnapshot, json.providerSlug, json.guestBestRecommendationPreviewEnabled === true, json.sidebarOnlyMeta === true);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    // eslint-disable-next-line no-console -- API diagnostics
    console.error('[scholarships api] POST error', {
      body: bodySnapshot,
      requiredSeoTags: bodySnapshot?.requiredSeoTags,
      message: err.message,
      stack: err.stack
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
