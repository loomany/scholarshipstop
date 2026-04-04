import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { parseDeadlineFromParam } from '@/app/scholarships/scholarshipListUrl';
import { parseSortFromParam } from '@/app/scholarships/scholarshipListUrl';
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
  scholarshipListRequestFromParts,
  type ScholarshipListMeta,
  type ScholarshipListRequest
} from '@/lib/scholarships/scholarshipListServer';
import type { Database } from '@/types_db';
import { profileMatchSummaryFromRow } from '@/lib/scholarships/profileMatchMeta';
import { buildScholarshipProfileFilterSeed } from '@/lib/scholarships/profileFilterDefaults';
import { getSubscription } from '@/utils/supabase/queries';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];
import {
  moreFiltersFromJson,
  moreFiltersToJson,
  type MoreFiltersJson
} from '@/lib/scholarships/scholarshipListApiCodec';
import {
  LIST_CARD_SELECT,
  mapScholarshipRow,
  type ScholarshipRow
} from '@/lib/scholarships/supabase';

export const dynamic = 'force-dynamic';

/** Temporary: hub sidebar personalized counts (best/recommended) SSR vs client refresh. Remove after diagnosis. */
function hubSidebarMetaDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.SCHOLARSHIPS_HUB_SIDEBAR_DEBUG === '1'
  );
}

function applyListingMetaGuestPatches(
  meta: ScholarshipListMeta,
  ctx: { authUser: boolean }
) {
  meta.sidebarCounts.bestMatches = 0;
  meta.sidebarCounts.recommended = 0;
  meta.sidebarCounts.easyApply = 0;
  delete meta.matchedTotal;
  if (!ctx.authUser) {
    meta.sidebarCounts.saved = 0;
    meta.sidebarCounts.ignored = 0;
    meta.sidebarCounts.started = 0;
    meta.sidebarCounts.submitted = 0;
    delete meta.profileMatchSummary;
    delete meta.profileFilterSeed;
    delete meta.matchedTotal;
  }
}

async function emptyListResult(
  req: ScholarshipListRequest,
  includeMeta: boolean,
  authUser: boolean
) {
  const supabase = createClient() as any;
  let meta: ScholarshipListMeta | undefined = undefined;
  if (includeMeta) {
    const bounds = await fetchGlobalFilterBounds(supabase);
    meta = await fetchScholarshipListMeta(supabase, req, bounds);
    applyListingMetaGuestPatches(meta, { authUser });
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
};

async function handleList(
  searchParams: URLSearchParams,
  bodyMoreFilters: MoreFiltersJson | undefined,
  bodyLongTail: string[] | undefined,
  seoBody?: SeoListBodyOpts
) {
  const supabase = createClient() as any;
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
  const similarTo = searchParams.get('similar_to');
  const similarCategorySlug = searchParams.get('similar_category_slug');
  const listScope = searchParams.get('scope');

  const bounds = await fetchGlobalFilterBounds(supabase);
  const moreFilters = moreFiltersFromJson(
    bodyMoreFilters,
    bounds
  );

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

  const tab = isHubPrimaryListing
    ? parseHubScholarshipTabParam(searchParams.get('tab'))
    : parseScholarshipTabParam(searchParams.get('tab'));

  const { legacyCategoryPageSlug, catalogSubjectCategoryId } =
    await resolveCatalogSubjectCategoryForPageSlug(supabase, categoryPageParam);

  let req: ScholarshipListRequest = applyCatalogOnlyListingNormalization(
    scholarshipListRequestFromParts({
      page,
      limit,
      sort,
      tab,
      q,
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
      longTailLegacySlugs: lt.filter(Boolean),
      similarTo,
      similarCategorySlug,
      listScope,
      requiredSeoTags: seoBody?.requiredSeoTags
    })
  );

  const hubDebugReqId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const hubDbg = hubSidebarMetaDebugEnabled() && isHubPrimaryListing;

  let authUser: { id?: string } | null = null;
  let profileRow: ProfilesRow | null = null;
  let isProSubscriber = false;
  let profileFilterSeed = null as ReturnType<typeof buildScholarshipProfileFilterSeed>;
  /** Load auth + profile for subscription tier, filter seed meta, and user tab counts. */
  const shouldLoadAuthAndProfile =
    !anonymousCatalogFastPath || isHubPrimaryListing;

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
      category_page: Boolean(categoryPageParam?.trim()),
      long_tail: lt.filter(Boolean).length > 0,
      similar_to: Boolean(similarTo?.trim()),
      rawScopeParam: listScope,
      rawTabParam: searchParams.get('tab')
    });
  }

  if (shouldLoadAuthAndProfile) {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    authUser = user;
    if (authUser?.id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      profileRow = prof;
      profileFilterSeed = buildScholarshipProfileFilterSeed(prof);
      const subscription = await getSubscription(supabase);
      isProSubscriber = Boolean(subscription);
    }
  }

  if (hubDbg) {
    // eslint-disable-next-line no-console -- temporary hub sidebar diagnosis
    console.log('[scholarships-hub-meta-debug] api after auth/profile', {
      reqId: hubDebugReqId,
      ts: new Date().toISOString(),
      authUserId: authUser?.id ?? null,
      profileExists: profileRow != null
    });
  }

  if (!similarTo && isEmptyIdTab(req)) {
    const r = await emptyListResult(
      req,
      includeMeta && !countOnly,
      Boolean(authUser)
    );
    if (hubDbg) {
      // eslint-disable-next-line no-console -- temporary hub sidebar diagnosis
      console.log('[scholarships-hub-meta-debug] api early emptyIdTab branch', {
        reqId: hubDebugReqId,
        tab: req.tab,
        metaBest: r.meta?.sidebarCounts.bestMatches,
        metaRec: r.meta?.sidebarCounts.recommended
      });
    }
    if (countOnly) {
      return NextResponse.json({ total: 0, page: req.page, limit: req.limit });
    }
    return NextResponse.json({
      scholarships: r.scholarships,
      total: 0,
      page: req.page,
      limit: req.limit,
      meta: r.meta
    });
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
    const { data, error, count } = await supabase
      .from('scholarships')
      .select(LIST_CARD_SELECT, { count: 'exact' })
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

  const result = seoFallbackEnabled
    ? await executeScholarshipListQueryWithSeoFallback(
        supabase,
        req,
        {
          countOnly,
          includeMeta: includeMeta && !countOnly,
          includeCategoryCounts:
            Boolean(isHubPrimaryListing) ||
            !anonymousCatalogFastPath ||
            Boolean(categoryPageParam?.trim()),
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
    : await executeScholarshipListQuery(supabase, req, {
        countOnly,
        includeMeta: includeMeta && !countOnly,
        includeCategoryCounts:
          Boolean(isHubPrimaryListing) ||
          !anonymousCatalogFastPath ||
          Boolean(categoryPageParam?.trim()),
        isProSubscriber
      });

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
      authUser: Boolean(authUser)
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
    return NextResponse.json({
      total: result.total,
      page: req.page,
      limit: req.limit,
      seoFallback: result.seoFallback
    });
  }

  // eslint-disable-next-line no-console -- temporary SEO list diagnostics
  console.log('SEO DEBUG RESPONSE', {
    countOnly: false,
    resultsLength: result.scholarships?.length,
    total: result.total,
    fallbackUsed: result.seoFallback?.used,
    tier: result.seoFallback?.tier
  });

  return NextResponse.json({
    scholarships: result.scholarships,
    /** Alias for clients expecting `results` (SEO fallback debugging). */
    results: result.scholarships,
    total: result.total,
    page: result.page,
    limit: result.limit,
    meta: result.meta,
    matchPaywall: result.matchPaywall,
    isProSubscriber,
    seoFallback: result.seoFallback
  });
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
    return await handleList(searchParams, bodyMore, lt, undefined);
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
    };
    // eslint-disable-next-line no-console -- API diagnostics (SEO listing debugging)
    console.log('[scholarships api] POST body snapshot', {
      keys: Object.keys(json),
      requiredSeoTags: json.requiredSeoTags,
      seoListingFallback: json.seoListingFallback,
      longTailLegacySlugs: json.longTailLegacySlugs
    });
    const sp = new URLSearchParams(json.searchParams ?? '');
    return await handleList(sp, json.moreFilters, json.longTailLegacySlugs, {
      seoListingFallback: json.seoListingFallback,
      slugOnlyMoreFilters: json.slugOnlyMoreFilters,
      requiredSeoTags: json.requiredSeoTags
    });
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
