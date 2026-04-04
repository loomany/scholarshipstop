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
import { profileMatchSummaryFromRow } from '@/lib/scholarships/profileMatchMeta';
import {
  buildScholarshipProfileFilterSeed
} from '@/lib/scholarships/profileFilterDefaults';
import type { createClient } from '@/utils/supabase/server';
import type { Database } from '@/types_db';
import { getSubscription } from '@/utils/supabase/queries';

type ServerSupabaseClient = ReturnType<typeof createClient>;
type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

/** Temporary: SSR hub sidebar counts vs client. Remove after diagnosis. */
function hubSsrSidebarDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.SCHOLARSHIPS_HUB_SIDEBAR_DEBUG === '1'
  );
}

/**
 * Hub `/scholarships` first paint: same catalog pipeline for signed-in and anonymous users.
 */
export async function fetchInitialHubScholarshipsPayload(
  supabase: ServerSupabaseClient
): Promise<ScholarshipListResult> {
  const bounds = await fetchGlobalFilterBounds(supabase);

  const {
    data: { user }
  } = await supabase.auth.getUser();

  let profileRow: ProfilesRow | null = null;
  let isProSubscriber = false;

  if (user?.id) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    profileRow = prof;
    const subscription = await getSubscription(supabase);
    isProSubscriber = Boolean(subscription);
  }

  const profileFilterSeed = buildScholarshipProfileFilterSeed(profileRow);
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
    moreFilters: defaultMoreFiltersFromBounds(bounds),
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
    isProSubscriber
  });

  if (result.meta && user?.id && profileRow) {
    result.meta.profileMatchSummary = profileMatchSummaryFromRow(profileRow);
    result.meta.profileFilterSeed = profileFilterSeed;
  } else if (result.meta && profileFilterSeed) {
    result.meta.profileFilterSeed = profileFilterSeed;
  }

  if (hubSsrSidebarDebugEnabled() && result.meta) {
    // eslint-disable-next-line no-console -- temporary hub sidebar diagnosis
    console.log('[scholarships-hub-meta-debug] ssr fetchInitialHubScholarshipsPayload', {
      ts: new Date().toISOString(),
      authUserId: user?.id ?? null,
      profileExists: profileRow != null,
      sidebarMatches: result.meta.sidebarCounts.matches
    });
  }

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
