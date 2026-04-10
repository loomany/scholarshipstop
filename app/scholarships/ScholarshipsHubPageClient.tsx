'use client';

/**
 * Main scholarships directory (tabs, search, filters) at `/scholarships`.
 * Data: server-paginated POST /api/scholarships (no full catalog in memory).
 */

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ScholarshipCard from '@/components/scholarships/ScholarshipCard';
import ScholarshipsListHeader from '@/components/scholarships/ScholarshipsListHeader';
import SubjectL2BrowseChips from '@/components/scholarships/SubjectL2BrowseChips';
import ScholarshipsMoreFiltersPanel from '@/components/scholarships/ScholarshipsMoreFiltersPanel';
import ScholarshipsPagination from '@/components/scholarships/ScholarshipsPagination';
import ScholarshipsSidebar from '@/components/scholarships/ScholarshipsSidebar';
import ScholarshipsTwoColumnLayout from '@/components/scholarships/ScholarshipsTwoColumnLayout';
import { ScholarshipsEmailConfirmationBanner } from '@/components/scholarships/ScholarshipsEmailConfirmationBanner';
import ScholarshipRegistrationWallModal from '@/components/scholarships/ScholarshipRegistrationWallModal';
import ScholarshipSubscriptionOfferModal from '@/components/scholarships/ScholarshipSubscriptionOfferModal';
import {
  SCHOLARSHIP_CATEGORY_ORDER,
  type ScholarshipCategoryId
} from './scholarshipCategories';
import type { Scholarship } from './scholarshipsData';
import {
  getIgnoredScholarshipIds,
  addIgnoredScholarship,
  removeIgnoredScholarship
} from './ignoredScholarships';
import {
  cloneMoreFilters,
  countMoreFilterDeltaFromBaseline,
  countMoreFilterSelections,
  defaultMoreFiltersFromBounds,
  type MoreFiltersState
} from './moreFilters';
import {
  readSavedFiltersFromStorage,
  writeSavedFiltersToStorage,
  SAVED_FILTERS_STORAGE_KEY
} from '@/lib/scholarships/savedFiltersStorage';
import {
  getSavedScholarshipIds,
  removeScholarship,
  saveScholarship
} from './savedScholarships';
import { getStartedScholarshipIds } from './startedScholarships';
import { getSubmittedScholarshipIds } from './submittedScholarships';
import { type SortOption } from './scholarshipSort';
import {
  parseHubScholarshipTabParam,
  scholarshipListLoadingText,
  scholarshipListPageTitle,
  scholarshipTabShowsCardActions,
  type ScholarshipListTabId,
  type ScholarshipSidebarCounts
} from './scholarshipTabs';
import { getViewedScholarshipIds } from './viewedScholarships';
import {
  buildScholarshipListSearchParams,
  clampScholarshipListPage,
  parseDeadlineFromParam,
  parseScholarshipListUrl,
  SCHOLARSHIPS_PAGE_SIZE
} from './scholarshipListUrl';
import {
  postScholarshipsList,
  postScholarshipsCount,
  postScholarshipsMeta
} from './scholarshipListFetch';
import type { InitialScholarshipsPayload } from './scholarshipListServerPayload';
import type { LongTailRouteScopePayload } from './scholarshipListServerPayload';
import {
  moreFiltersFromJson,
  moreFiltersToJson
} from '@/lib/scholarships/scholarshipListApiCodec';
import type { ScholarshipListMeta } from '@/lib/scholarships/scholarshipListServer';
import { mergeMoreFilterStates } from '@/lib/scholarships/seoScholarshipListing';
import { toast } from '@/components/ui/Toasts/use-toast';

/** Temporary: trace hub meta overwrite. Remove after diagnosis. */
function hubClientSidebarDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_SCHOLARSHIPS_HUB_SIDEBAR_DEBUG === '1'
  );
}

const EMPTY_SIDEBAR_COUNTS: ScholarshipSidebarCounts = {
  bestMatches: 0,
  recommended: 0,
  easyApply: 0,
  hotDeadlines: 0,
  matches: 0,
  saved: 0,
  started: 0,
  submitted: 0,
  ignored: 0
};
const SAVED_STORAGE_KEY = 'savedScholarships';
const IGNORED_STORAGE_KEY = 'scholarshipIgnored';
const STARTED_STORAGE_KEY = 'startedScholarships';
const SUBMITTED_STORAGE_KEY = 'submittedScholarships';

function buildHubListingSearchParams(options: {
  base: URLSearchParams;
  page: number;
  tab: ScholarshipListTabId;
  meta: boolean;
  saved: string[];
  ignored: string[];
  started: string[];
  submitted: string[];
  scope: 'personalized' | 'catalog';
}): URLSearchParams {
  const sp = new URLSearchParams(options.base.toString());
  if (options.page > 1) sp.set('page', String(options.page));
  else sp.delete('page');
  sp.set('limit', String(SCHOLARSHIPS_PAGE_SIZE));
  if (options.meta) sp.set('meta', '1');
  else sp.delete('meta');
  if (options.tab === 'matches') {
    sp.set('tab', 'matches');
  } else {
    sp.set('tab', options.tab);
  }
  if (options.scope === 'catalog') {
    sp.set('scope', 'catalog');
  } else {
    sp.delete('scope');
  }
  if (options.saved.length) sp.set('saved', options.saved.join(','));
  else sp.delete('saved');
  if (options.ignored.length) sp.set('ignored', options.ignored.join(','));
  else sp.delete('ignored');
  if (options.started.length) sp.set('started', options.started.join(','));
  else sp.delete('started');
  if (options.submitted.length)
    sp.set('submitted', options.submitted.join(','));
  else sp.delete('submitted');
  return sp;
}

function buildHubMoreFiltersBaseline(options: {
  meta: ScholarshipListMeta | null;
  searchParamsString: string;
  routeScope: LongTailRouteScopePayload | null;
}): MoreFiltersState | null {
  if (!options.meta) return null;
  const base = defaultMoreFiltersFromBounds(options.meta.filterBounds);
  // Hub default: Easy apply is informational in the sidebar and not preselected.
  base.includeEasyApply.clear();
  const deadline = parseDeadlineFromParam(
    new URLSearchParams(options.searchParamsString).get('deadline')
  );
  if (deadline && deadline !== 'any') {
    base.deadlinePreset = deadline;
  }
  if (!options.routeScope?.baseMoreFilters) return base;
  const routeScoped = moreFiltersFromJson(
    options.routeScope.baseMoreFilters,
    options.meta.filterBounds
  );
  return mergeMoreFilterStates(routeScoped, base);
}

function withTabEnforcedMoreFilters(
  filters: MoreFiltersState,
  tab: ScholarshipListTabId
): MoreFiltersState {
  if (tab === 'easy-apply') {
    const next = cloneMoreFilters(filters);
    next.includeEasyApply.add('easy_apply');
    return next;
  }
  if (tab === 'hot-deadlines') {
    const next = cloneMoreFilters(filters);
    next.deadlinePreset = 'any';
    return next;
  }
  return filters;
}

function ScholarshipsPageInner({
  isAuthenticated,
  hasSubscription = false,
  initialPayload = null,
  routeScope = null,
  leadContent = null,
  postListingContent = null
}: {
  isAuthenticated: boolean;
  hasSubscription?: boolean;
  initialPayload?: InitialScholarshipsPayload | null;
  routeScope?: LongTailRouteScopePayload | null;
  leadContent?: ReactNode;
  postListingContent?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const activeTab: ScholarshipListTabId = parseHubScholarshipTabParam(
    searchParams.get('tab')
  );

  const parsedList = useMemo(
    () => parseScholarshipListUrl(new URLSearchParams(searchParamsString)),
    [searchParamsString]
  );
  const sortBy = parsedList.sort;
  const appliedCategoryIds = parsedList.categories;
  const catalogListScope = 'catalog' as const;

  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>(
    initialPayload?.result.scholarships ?? []
  );
  const [totalCount, setTotalCount] = useState(
    initialPayload?.result.total ?? 0
  );
  const [listMeta, setListMeta] = useState<ScholarshipListMeta | null>(
    initialPayload?.result.meta ?? null
  );
  const [isLoading, setIsLoading] = useState(initialPayload == null);
  const [hasError, setHasError] = useState(false);
  const [query, setQuery] = useState(parsedList.q);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [startedIds, setStartedIds] = useState<string[]>([]);
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const [registrationWallOpen, setRegistrationWallOpen] = useState(false);
  const [subscriptionOfferOpen, setSubscriptionOfferOpen] = useState(false);
  const isSubscriptionLocked = isAuthenticated && !hasSubscription;
  const LOCKED_TABS_FOR_UNSUBSCRIBED = useMemo(
    () =>
      new Set<ScholarshipListTabId>([
        'best-matches',
        'recommended',
        'easy-apply',
        'hot-deadlines'
      ]),
    []
  );

  const syncUserCollectionIdsFromStorage = useCallback(() => {
    if (!isAuthenticated) return;
    setSavedIds(getSavedScholarshipIds());
    setIgnoredIds(getIgnoredScholarshipIds());
    setStartedIds(getStartedScholarshipIds());
    setSubmittedIds(getSubmittedScholarshipIds());
  }, [isAuthenticated]);

  const openRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(true);
  }, []);

  const closeRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(false);
  }, []);

  const openSubscriptionOffer = useCallback(() => {
    setSubscriptionOfferOpen(true);
  }, []);

  const closeSubscriptionOffer = useCallback(() => {
    setSubscriptionOfferOpen(false);
  }, []);

  const replaceListingParams = useCallback(
    (
      patch: Parameters<typeof buildScholarshipListSearchParams>[1],
      options?: { scroll?: boolean }
    ) => {
      const p = buildScholarshipListSearchParams(
        new URLSearchParams(searchParams.toString()),
        patch
      );
      const qs = p.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      router.replace(url, { scroll: options?.scroll ?? false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedIds([]);
      setIgnoredIds([]);
      setStartedIds([]);
      setSubmittedIds([]);
      return;
    }
    syncUserCollectionIdsFromStorage();
  }, [isAuthenticated, syncUserCollectionIdsFromStorage]);
  const routeScopeHasLockedEasyApplyCategory = useMemo(() => {
    if (!routeScope) return false;
    const premiumLegacySlugs = new Set([
      'no-essay',
      'easy-apply',
      'quick-apply',
      'few-requirements'
    ]);
    const hasPremiumLegacySlug = routeScope.longTailLegacySlugs.some((slug) =>
      premiumLegacySlugs.has(slug)
    );
    if (hasPremiumLegacySlug) return true;
    const requiredTags = new Set(routeScope.requiredSeoTags);
    return (
      requiredTags.has('no_essay') ||
      requiredTags.has('easy_apply') ||
      requiredTags.has('quick_apply') ||
      requiredTags.has('few_requirements')
    );
  }, [routeScope]);
  useEffect(() => {
    if (!isSubscriptionLocked) return;
    if (!LOCKED_TABS_FOR_UNSUBSCRIBED.has(activeTab)) return;
    openSubscriptionOffer();
    replaceListingParams({
      tab: 'matches',
      scope: 'catalog',
      resetPage: true
    });
  }, [
    activeTab,
    isSubscriptionLocked,
    openSubscriptionOffer,
    replaceListingParams,
    LOCKED_TABS_FOR_UNSUBSCRIBED
  ]);
  useEffect(() => {
    if (!isSubscriptionLocked) return;
    if (!routeScopeHasLockedEasyApplyCategory) return;
    openSubscriptionOffer();
    replaceListingParams({
      tab: 'matches',
      scope: 'catalog',
      resetPage: true
    });
  }, [
    isSubscriptionLocked,
    routeScopeHasLockedEasyApplyCategory,
    openSubscriptionOffer,
    replaceListingParams
  ]);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [moreFiltersApplied, setMoreFiltersApplied] =
    useState<MoreFiltersState | null>(() =>
      buildHubMoreFiltersBaseline({
        meta: initialPayload?.result.meta ?? null,
        searchParamsString,
        routeScope
      })
    );
  const [moreFiltersDraft, setMoreFiltersDraft] =
    useState<MoreFiltersState | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewCountLoading, setPreviewCountLoading] = useState(false);
  const [lastKnownPreviewCount, setLastKnownPreviewCount] = useState<
    number | null
  >(null);
  const metaKeySynced = useRef('');
  const metaRequestInFlightRef = useRef<string | null>(null);
  const initialRequestKeyRef = useRef(initialPayload?.requestKey ?? null);
  const listMetaRef = useRef<ScholarshipListMeta | null>(listMeta);
  listMetaRef.current = listMeta;

  const userListIdsRef = useRef({
    saved: savedIds,
    ignored: ignoredIds,
    started: startedIds,
    submitted: submittedIds
  });
  userListIdsRef.current = {
    saved: savedIds,
    ignored: ignoredIds,
    started: startedIds,
    submitted: submittedIds
  };

  /** Strip hidden hub tabs from the URL (Started / Submitted still exist in types & API). */
  useEffect(() => {
    const raw = searchParams.get('tab');
    if (raw === 'started' || raw === 'submitted') {
      replaceListingParams({
        tab: 'matches',
        scope: 'catalog',
        resetPage: false
      });
    }
  }, [searchParams, replaceListingParams]);

  /**
   * Guests: one-shot URL normalization (avoids races between multiple effects).
   * — default hub tab + catalog scope when `tab` is missing
   * — strip only unsupported guest params from the URL
   */
  useEffect(() => {
    if (isAuthenticated) return;
    const sp = new URLSearchParams(searchParamsString);
    const tab = sp.get('tab');
    const badTab =
      tab === 'best-matches' ||
      tab === 'recommended' ||
      tab === 'hot-deadlines' ||
      tab === 'saved' ||
      tab === 'ignored';
    const needDefaultHubTab = !tab;
    const parsedDeadline = parseDeadlineFromParam(sp.get('deadline'));
    const hasAdvDeadline = parsedDeadline != null && parsedDeadline !== 'any';
    if (!badTab && !needDefaultHubTab && !hasAdvDeadline) {
      return;
    }
    const resetPage = badTab || hasAdvDeadline;
    replaceListingParams({
      ...(needDefaultHubTab || badTab
        ? { tab: 'matches', scope: 'catalog' }
        : {}),
      ...(hasAdvDeadline ? { deadline: 'any' } : {}),
      resetPage
    });
  }, [isAuthenticated, searchParamsString, replaceListingParams]);

  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(parsedList.q);
  }, [parsedList.q]);

  useEffect(() => {
    return () => {
      if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    };
  }, []);

  const onQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
      queryDebounceRef.current = setTimeout(() => {
        queryDebounceRef.current = null;
        replaceListingParams({ q: value, resetPage: true });
      }, 350);
    },
    [replaceListingParams]
  );

  const onApplyCategories = useCallback(
    (next: Set<ScholarshipCategoryId>) => {
      replaceListingParams({ categories: next, resetPage: true });
    },
    [replaceListingParams]
  );

  const onSortChange = useCallback(
    (value: SortOption) => {
      replaceListingParams({ sort: value, resetPage: true });
    },
    [replaceListingParams]
  );

  useEffect(() => {
    setViewedIds(getViewedScholarshipIds());
  }, [pathname, activeTab]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'scholarshipViewedIds' || e.key === null) {
        setViewedIds(getViewedScholarshipIds());
      }
      if (
        e.key === SAVED_STORAGE_KEY ||
        e.key === IGNORED_STORAGE_KEY ||
        e.key === STARTED_STORAGE_KEY ||
        e.key === SUBMITTED_STORAGE_KEY ||
        e.key === null
      ) {
        syncUserCollectionIdsFromStorage();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [syncUserCollectionIdsFromStorage]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        setViewedIds(getViewedScholarshipIds());
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const filterBounds = listMeta?.filterBounds ?? {
    amountMin: 0,
    amountMax: 50000,
    applicantsMin: 0,
    applicantsMax: 200000
  };

  const [savedFiltersRevision, setSavedFiltersRevision] = useState(0);
  const savedFiltersForHub = useMemo(() => {
    return readSavedFiltersFromStorage(filterBounds);
  }, [filterBounds, savedFiltersRevision]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVED_FILTERS_STORAGE_KEY || e.key === null) {
        setSavedFiltersRevision((n) => n + 1);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const routeBaseMoreFilters = useMemo(
    () =>
      routeScope?.baseMoreFilters
        ? moreFiltersFromJson(routeScope.baseMoreFilters, filterBounds)
        : null,
    [routeScope?.baseMoreFilters, filterBounds]
  );

  const savedFiltersSnapshotJson = useMemo(() => {
    if (!isAuthenticated || !savedFiltersForHub) return null;
    const merged =
      routeBaseMoreFilters != null
        ? mergeMoreFilterStates(routeBaseMoreFilters, savedFiltersForHub)
        : savedFiltersForHub;
    return moreFiltersToJson(merged);
  }, [
    isAuthenticated,
    savedFiltersForHub,
    routeBaseMoreFilters,
    savedFiltersRevision
  ]);
  const moreFiltersBaseline = useMemo(
    () =>
      buildHubMoreFiltersBaseline({
        meta: listMeta,
        searchParamsString,
        routeScope
      }),
    [listMeta, searchParamsString, routeScope]
  );
  const emptyMoreFiltersState = useMemo(
    () =>
      cloneMoreFilters(
        moreFiltersBaseline ?? defaultMoreFiltersFromBounds(filterBounds)
      ),
    [moreFiltersBaseline, filterBounds]
  );

  const saveFilterEnabled = useMemo(() => {
    if (!moreFiltersDraft || !isAuthenticated) return false;
    const merged =
      routeBaseMoreFilters != null
        ? mergeMoreFilterStates(routeBaseMoreFilters, moreFiltersDraft)
        : cloneMoreFilters(moreFiltersDraft);
    return countMoreFilterSelections(merged, filterBounds) > 0;
  }, [
    moreFiltersDraft,
    isAuthenticated,
    routeBaseMoreFilters,
    filterBounds
  ]);

  const saveMoreFiltersPreset = useCallback(() => {
    if (!isAuthenticated) {
      openRegistrationWall();
      return;
    }
    if (isSubscriptionLocked) {
      openSubscriptionOffer();
      return;
    }
    if (!moreFiltersDraft || !saveFilterEnabled) return;
    const merged =
      routeBaseMoreFilters != null
        ? mergeMoreFilterStates(routeBaseMoreFilters, moreFiltersDraft)
        : cloneMoreFilters(moreFiltersDraft);
    writeSavedFiltersToStorage(merged);
    setSavedFiltersRevision((n) => n + 1);
    setMoreFiltersApplied(cloneMoreFilters(merged));
    replaceListingParams({
      tab: 'recommended',
      deadline: merged.deadlinePreset,
      resetPage: true
    });
    setMoreFiltersOpen(false);

    const approxCount = previewCount ?? lastKnownPreviewCount;
    const countPhrase =
      approxCount != null && Number.isFinite(approxCount)
        ? ` (${approxCount.toLocaleString('en-US')})`
        : '';
    toast({
      title: 'Filter saved',
      description: `Your criteria are stored in Saved Filters${countPhrase} under My scholarships. Open that tab anytime to browse scholarships that match this preset.`
    });
  }, [
    isAuthenticated,
    moreFiltersDraft,
    saveFilterEnabled,
    routeBaseMoreFilters,
    openRegistrationWall,
    openSubscriptionOffer,
    isSubscriptionLocked,
    replaceListingParams,
    previewCount,
    lastKnownPreviewCount
  ]);

  useEffect(() => {
    if (activeTab !== 'recommended' || !isAuthenticated || !savedFiltersForHub) {
      return;
    }
    const merged =
      routeBaseMoreFilters != null
        ? mergeMoreFilterStates(routeBaseMoreFilters, savedFiltersForHub)
        : savedFiltersForHub;
    setMoreFiltersApplied(cloneMoreFilters(merged));
  }, [
    activeTab,
    isAuthenticated,
    savedFiltersForHub,
    routeBaseMoreFilters,
    savedFiltersRevision
  ]);

  const sidebarCounts = useMemo((): ScholarshipSidebarCounts => {
    return listMeta?.sidebarCounts ?? EMPTY_SIDEBAR_COUNTS;
  }, [listMeta?.sidebarCounts]);

  const categoryCounts = useMemo(() => {
    if (listMeta?.categoryCounts) return listMeta.categoryCounts;
    const z = {} as Record<ScholarshipCategoryId, number>;
    for (const id of SCHOLARSHIP_CATEGORY_ORDER) z[id] = 0;
    return z;
  }, [listMeta?.categoryCounts]);

  const moreFiltersFingerprint = useMemo(() => {
    if (!moreFiltersApplied) return 'none';
    return JSON.stringify(
      moreFiltersToJson(withTabEnforcedMoreFilters(moreFiltersApplied, activeTab))
    );
  }, [moreFiltersApplied, activeTab]);
  const userCollectionsFingerprint = useMemo(
    () =>
      JSON.stringify({
        saved: savedIds,
        ignored: ignoredIds,
        started: startedIds,
        submitted: submittedIds
      }),
    [savedIds, ignoredIds, startedIds, submittedIds]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / SCHOLARSHIPS_PAGE_SIZE)
  );
  const rawPageParam = new URLSearchParams(searchParamsString).get('page');
  const pageFromUrl = Math.max(1, Number.parseInt(rawPageParam ?? '1', 10));
  const currentPage = clampScholarshipListPage(rawPageParam, totalPages);

  useEffect(() => {
    let cancelled = false;
    const metaKey = `${activeTab}|${catalogListScope}|${searchParamsString}|${moreFiltersFingerprint}|sf:${savedFiltersSnapshotJson ?? 'none'}`;
    /**
     * Keep visible list stable on membership mutations (save/ignore/restore):
     * collection changes are handled optimistically in local state and should not
     * invalidate this effect.
     */
    const requestCacheKey = metaKey;
    const currentRequestKey = routeScope
      ? `long_tail:${pathname.replace(/^\/scholarships\//, '')}:${searchParamsString}`
      : `hub:hub:${searchParamsString}`;
    /**
     * Hub first paint: reuse SSR `initialPayload` when the URL matches the server request key
     * (`hub:hub:` + same search string). Avoids a duplicate POST /api/scholarships on hydration.
     * Any change to tab, page, filters, or query params changes `currentRequestKey` or effect deps → fetch.
     */
    if (
      initialRequestKeyRef.current === currentRequestKey &&
      initialPayload?.result
    ) {
      initialRequestKeyRef.current = null;
      if (initialPayload.result.meta) {
        metaKeySynced.current = requestCacheKey;
      }
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      try {
        if (isAuthenticated && activeTab === 'recommended' && !savedFiltersForHub) {
          setScholarships([]);
          setTotalCount(0);
          setHasError(false);
          setIsLoading(false);
          return;
        }
        setIsLoading(true);
        setHasError(false);
        const ids = userListIdsRef.current;
        const sp = buildHubListingSearchParams({
          base: new URLSearchParams(searchParamsString),
          page: pageFromUrl,
          tab: activeTab,
          meta: false,
          saved: ids.saved,
          ignored: ids.ignored,
          started: ids.started,
          submitted: ids.submitted,
          scope: catalogListScope
        });
        const cDbg = hubClientSidebarDebugEnabled();
        if (cDbg) {
          let moreFiltersSummary: unknown = null;
          try {
            moreFiltersSummary =
              moreFiltersApplied != null
                ? moreFiltersToJson(moreFiltersApplied)
                : null;
          } catch {
            moreFiltersSummary = '(serialize error)';
          }
          // eslint-disable-next-line no-console -- temporary hub sidebar diagnosis
          console.log('[scholarships-hub-meta-debug] client before fetch', {
            ts: new Date().toISOString(),
            pathname,
            searchParamsString,
            activeTab,
            effectiveListScope: catalogListScope,
            q: parsedList.q,
            includeMetaRequested: false,
            requestCacheKey,
            metaKeySyncedBefore: metaKeySynced.current,
            idCounts: {
              saved: ids.saved.length,
              ignored: ids.ignored.length,
              started: ids.started.length,
              submitted: ids.submitted.length
            },
            moreFiltersSummary,
            isAuthenticated,
            requestSearchParams: sp.toString()
          });
        }
        const prevMeta = listMetaRef.current;
        const effectiveMoreFilters =
          routeBaseMoreFilters && moreFiltersApplied
            ? mergeMoreFilterStates(routeBaseMoreFilters, moreFiltersApplied)
            : (moreFiltersApplied ?? routeBaseMoreFilters);
        const tabAwareMoreFilters = effectiveMoreFilters
          ? withTabEnforcedMoreFilters(effectiveMoreFilters, activeTab)
          : undefined;
        const data = await postScholarshipsList({
          searchParams: sp.toString(),
          moreFilters: tabAwareMoreFilters
            ? moreFiltersToJson(tabAwareMoreFilters)
            : undefined,
          savedFiltersSnapshot: savedFiltersSnapshotJson,
          longTailLegacySlugs: routeScope?.longTailLegacySlugs ?? [],
          requiredSeoTags: routeScope?.requiredSeoTags ?? [],
          seoListingFallback: routeScope?.seoListingFallback,
          slugOnlyMoreFilters: routeScope?.slugOnlyMoreFilters
        });
        if (cancelled) return;
        setScholarships(data.scholarships);
        setTotalCount(data.total);
        if (cDbg) {
          const nextMeta = data.meta;
          // eslint-disable-next-line no-console -- temporary hub sidebar diagnosis
          console.log('[scholarships-hub-meta-debug] client after fetch', {
            ts: new Date().toISOString(),
            responseTotal: data.total,
            responsePage: data.page,
            responseMetaBest: nextMeta?.sidebarCounts.bestMatches,
            responseMetaRec: nextMeta?.sidebarCounts.recommended,
            responseMetaMatches: nextMeta?.sidebarCounts.matches,
            responseMetaEasyApply: nextMeta?.sidebarCounts.easyApply,
            hadMetaInResponse: Boolean(nextMeta),
            willCallSetListMeta: Boolean(nextMeta),
            prevListMetaBest: prevMeta?.sidebarCounts.bestMatches,
            prevListMetaRec: prevMeta?.sidebarCounts.recommended,
            nextListMetaBest: nextMeta?.sidebarCounts.bestMatches,
            nextListMetaRec: nextMeta?.sidebarCounts.recommended
          });
        }
        if (data.meta) {
          setListMeta(data.meta);
          metaKeySynced.current = requestCacheKey;
        }
      } catch (e) {
        // eslint-disable-next-line no-console -- list fetch diagnostics
        console.error('[ScholarshipsHub] postScholarshipsList failed', e);
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    searchParamsString,
    pageFromUrl,
    activeTab,
    moreFiltersFingerprint,
    catalogListScope,
    routeScope,
    pathname,
    routeBaseMoreFilters,
    savedFiltersForHub,
    savedFiltersSnapshotJson
  ]);

  useEffect(() => {
    let cancelled = false;
    const metaKey = `${activeTab}|${catalogListScope}|${searchParamsString}|${moreFiltersFingerprint}|${userCollectionsFingerprint}|sf:${savedFiltersSnapshotJson ?? 'none'}`;
    if (metaKeySynced.current === metaKey) return;
    if (metaRequestInFlightRef.current === metaKey) return;
    metaRequestInFlightRef.current = metaKey;

    const run = async () => {
      try {
        const ids = userListIdsRef.current;
        const sp = buildHubListingSearchParams({
          base: new URLSearchParams(searchParamsString),
          page: 1,
          tab: activeTab,
          meta: true,
          saved: ids.saved,
          ignored: ids.ignored,
          started: ids.started,
          submitted: ids.submitted,
          scope: catalogListScope
        });
        const metaResponse = await postScholarshipsMeta({
          searchParams: sp.toString(),
          /**
           * Sidebar meta counts are cross-tab numbers (matches/saved/ignored/easy).
           * Do not inject tab-enforced Easy apply filter here, otherwise `matches`
           * gets narrowed by the active tab's extra filter when tab=easy-apply.
           */
          moreFilters: moreFiltersToJson(
            routeBaseMoreFilters && moreFiltersApplied
              ? mergeMoreFilterStates(routeBaseMoreFilters, moreFiltersApplied)
              : (moreFiltersApplied ??
                  routeBaseMoreFilters ??
                  defaultMoreFiltersFromBounds(filterBounds))
          ),
          savedFiltersSnapshot: savedFiltersSnapshotJson,
          longTailLegacySlugs: routeScope?.longTailLegacySlugs ?? [],
          requiredSeoTags: routeScope?.requiredSeoTags ?? [],
          seoListingFallback: routeScope?.seoListingFallback,
          slugOnlyMoreFilters: routeScope?.slugOnlyMoreFilters
        });
        if (cancelled) return;
        if (metaResponse.meta) {
          setListMeta(metaResponse.meta);
          metaKeySynced.current = metaKey;
        }
      } catch {
        if (!cancelled) {
          // no-op: keep fallback sidebar until next attempt
        }
      } finally {
        if (metaRequestInFlightRef.current === metaKey) {
          metaRequestInFlightRef.current = null;
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    searchParamsString,
    moreFiltersFingerprint,
    userCollectionsFingerprint,
    catalogListScope,
    moreFiltersApplied,
    routeScope,
    filterBounds,
    routeBaseMoreFilters,
    savedFiltersSnapshotJson
  ]);

  useEffect(() => {
    if (isLoading || totalCount === 0) return;
    const requested = Number.parseInt(rawPageParam ?? '1', 10);
    const valid = clampScholarshipListPage(rawPageParam, totalPages);
    if (!Number.isFinite(requested) || requested < 1 || valid !== requested) {
      replaceListingParams({ page: valid, resetPage: false });
    }
  }, [isLoading, totalCount, totalPages, rawPageParam, replaceListingParams]);

  const openMoreFilters = useCallback(() => {
    const basis = withTabEnforcedMoreFilters(
      moreFiltersApplied ?? emptyMoreFiltersState,
      activeTab
    );
    setMoreFiltersDraft(cloneMoreFilters(basis));
    setMoreFiltersOpen(true);
  }, [moreFiltersApplied, emptyMoreFiltersState, activeTab]);

  const applyMoreFilters = useCallback(() => {
    if (moreFiltersDraft) {
      const next = cloneMoreFilters(moreFiltersDraft);
      setMoreFiltersApplied(next);
      replaceListingParams({
        deadline: next.deadlinePreset,
        resetPage: true
      });
    }
    setMoreFiltersOpen(false);
  }, [
    moreFiltersDraft,
    replaceListingParams
  ]);

  const clearMoreFiltersDraft = useCallback(() => {
    setMoreFiltersDraft(cloneMoreFilters(emptyMoreFiltersState));
  }, [emptyMoreFiltersState]);

  useEffect(() => {
    if (!moreFiltersOpen || !moreFiltersDraft) {
      setPreviewCount(null);
      setPreviewCountLoading(false);
      return;
    }
    setPreviewCountLoading(true);
    let cancelled = false;
    const t = setTimeout(() => {
      const ids = userListIdsRef.current;
      const sp = buildHubListingSearchParams({
        base: new URLSearchParams(searchParamsString),
        page: 1,
        tab: activeTab,
        meta: false,
        saved: ids.saved,
        ignored: ids.ignored,
        started: ids.started,
        submitted: ids.submitted,
        scope: catalogListScope
      });
      postScholarshipsCount({
        searchParams: sp.toString(),
        moreFilters: moreFiltersToJson(
          withTabEnforcedMoreFilters(
            mergeMoreFilterStates(
              routeBaseMoreFilters ?? defaultMoreFiltersFromBounds(filterBounds),
              moreFiltersDraft
            ),
            activeTab
          )
        ),
        longTailLegacySlugs: routeScope?.longTailLegacySlugs ?? [],
        requiredSeoTags: routeScope?.requiredSeoTags ?? [],
        seoListingFallback: routeScope?.seoListingFallback,
        slugOnlyMoreFilters: routeScope?.slugOnlyMoreFilters
      })
        .then((r) => {
          if (cancelled) return;
          setPreviewCount(r.total);
          setLastKnownPreviewCount(r.total);
          setPreviewCountLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setPreviewCount(null);
          setPreviewCountLoading(false);
        });
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    moreFiltersDraft,
    moreFiltersOpen,
    searchParamsString,
    activeTab,
    catalogListScope,
    routeScope,
    filterBounds,
    routeBaseMoreFilters
  ]);

  const buildPageHref = useCallback(
    (page: number) => {
      const p = buildScholarshipListSearchParams(
        new URLSearchParams(searchParams.toString()),
        { page, resetPage: false }
      );
      const qs = p.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, searchParams]
  );

  const moreFiltersOffDefault = useMemo(() => {
    if (!moreFiltersApplied) return false;
    const baseline =
      moreFiltersBaseline ?? defaultMoreFiltersFromBounds(filterBounds);
    return countMoreFilterDeltaFromBaseline(moreFiltersApplied, baseline) > 0;
  }, [moreFiltersApplied, moreFiltersBaseline, filterBounds]);

  const moreFiltersActiveCount = useMemo(() => {
    if (!moreFiltersApplied) return 0;
    if (moreFiltersBaseline) {
      return countMoreFilterDeltaFromBaseline(
        moreFiltersApplied,
        moreFiltersBaseline
      );
    }
    return countMoreFilterSelections(moreFiltersApplied, filterBounds);
  }, [moreFiltersApplied, moreFiltersBaseline, filterBounds]);

  const hasListingParams =
    parsedList.q.length > 0 ||
    parsedList.categories.size > 0 ||
    parsedList.sort !== 'most_recent' ||
    (parsedList.deadline != null && parsedList.deadline !== 'any');

  const clearListingFilters = useCallback(() => {
    if (queryDebounceRef.current) {
      clearTimeout(queryDebounceRef.current);
      queryDebounceRef.current = null;
    }
    setQuery('');
    setMoreFiltersApplied(cloneMoreFilters(emptyMoreFiltersState));
    router.replace(pathname, { scroll: false });
  }, [router, emptyMoreFiltersState, pathname]);

  const showProfileWhy = false;

  const showPersonalizedMatchOnCards = false;

  const listStart = (currentPage - 1) * SCHOLARSHIPS_PAGE_SIZE;
  const toggleSave = useCallback(
    (id: string) => {
      if (!isAuthenticated) {
        openRegistrationWall();
        return;
      }
      const wasSaved = savedIds.includes(id);
      if (activeTab === 'saved' && wasSaved) {
        setScholarships((prev) => prev.filter((s) => s.id !== id));
        setTotalCount((c) => Math.max(0, c - 1));
      }
      setSavedIds(wasSaved ? removeScholarship(id) : saveScholarship(id));
      setListMeta((prev) =>
        prev
          ? {
              ...prev,
              sidebarCounts: {
                ...prev.sidebarCounts,
                saved: Math.max(0, prev.sidebarCounts.saved + (wasSaved ? -1 : 1))
              }
            }
          : prev
      );
    },
    [activeTab, isAuthenticated, openRegistrationWall, savedIds]
  );

  const ignoreScholarship = useCallback(
    (id: string) => {
      if (!isAuthenticated) {
        openRegistrationWall();
        return;
      }
      setIgnoredIds(addIgnoredScholarship(id));
      setListMeta((prev) =>
        prev
          ? {
              ...prev,
              sidebarCounts: {
                ...prev.sidebarCounts,
                ignored: prev.sidebarCounts.ignored + 1
              }
            }
          : prev
      );
      if (activeTab !== 'ignored') {
        setScholarships((prev) => prev.filter((s) => s.id !== id));
        setTotalCount((c) => Math.max(0, c - 1));
      }
    },
    [activeTab, isAuthenticated, openRegistrationWall]
  );

  const restoreScholarship = useCallback(
    (id: string) => {
      if (!isAuthenticated) {
        openRegistrationWall();
        return;
      }
      setIgnoredIds(removeIgnoredScholarship(id));
      setListMeta((prev) =>
        prev
          ? {
              ...prev,
              sidebarCounts: {
                ...prev.sidebarCounts,
                ignored: Math.max(0, prev.sidebarCounts.ignored - 1)
              }
            }
          : prev
      );
      if (activeTab === 'ignored') {
        setScholarships((prev) => prev.filter((s) => s.id !== id));
        setTotalCount((c) => Math.max(0, c - 1));
      }
    },
    [activeTab, isAuthenticated, openRegistrationWall]
  );

  const resultCountForHeader = isLoading ? null : totalCount;
  const showingFrom = !isLoading && totalCount > 0 ? listStart + 1 : null;
  const showingTo =
    !isLoading && totalCount > 0
      ? Math.min(listStart + SCHOLARSHIPS_PAGE_SIZE, totalCount)
      : null;

  const showClearFilters =
    totalCount === 0 &&
    !isLoading &&
    !hasError &&
    (hasListingParams || moreFiltersOffDefault || query.trim().length > 0);

  const emptyMessage = useMemo(() => {
    if (
      !isAuthenticated &&
      (activeTab === 'best-matches' || activeTab === 'recommended')
    ) {
      return 'Create an account to see personalized matches.';
    }
    switch (activeTab) {
      case 'saved':
        return 'No saved scholarships yet. Tap the heart on a grant to save it here.';
      case 'ignored':
        return 'No ignored scholarships. Use “Not relevant” on a card to hide a grant from your matches.';
      case 'best-matches':
        return 'No best recommendations for the current filters. Try broadening your search or opening Matches.';
      case 'recommended':
        if (isAuthenticated && !savedFiltersForHub) {
          return 'Save a filter preset to use this tab: open More filters, choose options, then tap Save filter.';
        }
        return 'No scholarships match your saved filters. Adjust More filters or browse Matches.';
      case 'easy-apply':
        return 'No easy-apply scholarships in this set. Try broadening categories or More filters.';
      case 'hot-deadlines':
        return 'No scholarships with deadlines in the next week in this set. Try Matches or broaden filters.';
      default:
        return 'No scholarships match your filters. Try adjusting search or filters.';
    }
  }, [activeTab, isAuthenticated, savedFiltersForHub]);

  const guestPersonalizedEmpty =
    !isAuthenticated &&
    (activeTab === 'best-matches' || activeTab === 'recommended');
  const profileIncompletePersonalizedEmpty =
    isAuthenticated &&
    totalCount === 0 &&
    !isLoading &&
    (activeTab === 'best-matches' || activeTab === 'recommended') &&
    listMeta?.personalizedMatchReady === false;

  return (
    <section className="min-h-screen bg-[#F3F7FA] px-4 py-8 text-left text-zinc-900 sm:px-5 md:py-12 lg:px-8">
      <ScholarshipsTwoColumnLayout
        maxWidth="listing"
        lead={
          leadContent ?? (
            <div className="space-y-5 sm:space-y-6">
              <ScholarshipsEmailConfirmationBanner />
              <h1 className="min-w-0 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-[2rem] lg:leading-tight">
                {scholarshipListPageTitle(activeTab, {
                  guest: !isAuthenticated
                })}
              </h1>
            </div>
          )
        }
        sidebar={
          <ScholarshipsSidebar
            counts={sidebarCounts}
            matchesNewIndicator={null}
            guestMode={!isAuthenticated}
            onGuestRestrictedNav={!isAuthenticated ? openRegistrationWall : undefined}
            subscriptionLocked={isSubscriptionLocked}
            onSubscriptionRestrictedNav={isSubscriptionLocked ? openSubscriptionOffer : undefined}
          />
        }
      >
        <>
          <ScholarshipsListHeader
            query={query}
            onQueryChange={onQueryChange}
            categoryCounts={categoryCounts}
            appliedCategoryIds={appliedCategoryIds}
            onApplyCategories={onApplyCategories}
            sortBy={sortBy}
            onSortChange={onSortChange}
            resultCount={resultCountForHeader}
            showingFrom={showingFrom}
            showingTo={showingTo}
            onOpenMoreFilters={openMoreFilters}
            pageTitle={scholarshipListPageTitle(activeTab, {
              guest: !isAuthenticated
            })}
            omitHeadlineBlock
            loadingCountText={scholarshipListLoadingText(activeTab)}
            listTab={activeTab}
            categoriesDisabled={!isLoading && totalCount === 0}
            moreFiltersActiveCount={moreFiltersActiveCount}
            isAuthenticated={isAuthenticated}
            hasSubscription={hasSubscription}
            onGuestSortBlocked={!isAuthenticated ? openRegistrationWall : undefined}
            onSubscriptionSortBlocked={
              isSubscriptionLocked ? openSubscriptionOffer : undefined
            }
            onGuestLockedAction={!isAuthenticated ? openRegistrationWall : undefined}
          />

          {!isAuthenticated && activeTab !== 'matches' ? (
            <SubjectL2BrowseChips />
          ) : null}

          {isLoading ? (
            <div className="text-slate-600">Loading scholarships...</div>
          ) : hasError ? (
            <div className="text-red-600">Failed to load scholarships</div>
          ) : totalCount === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-10 text-center text-slate-600 shadow-sm">
              <p className="text-base font-medium text-zinc-800">
                {emptyMessage}
              </p>
              {guestPersonalizedEmpty ? (
                <p className="mt-5">
                  <Link
                    href="/onboarding?step=3"
                    className="text-sm font-semibold text-zinc-900 underline decoration-zinc-400 underline-offset-2 transition hover:text-zinc-700"
                  >
                    Create a free account
                  </Link>
                </p>
              ) : profileIncompletePersonalizedEmpty ? (
                <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-[#FFD9B3] bg-gradient-to-b from-[#FFF8F1] to-white p-6 text-left shadow-sm">
                  <h3 className="text-base font-semibold text-[#7A3B00] sm:text-lg">
                    {activeTab === 'best-matches'
                      ? 'Complete your profile to unlock best matches'
                      : 'Complete your profile so we can align saved filters with your profile defaults.'}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#8C5A2B]">
                    {activeTab === 'best-matches'
                      ? 'Add your school level, field of study, citizenship, GPA, and location so we can show scholarships that fit you better.'
                      : 'Fill in your academic and eligibility details so saved filters can merge with your profile where helpful.'}
                  </p>
                  <div className="mt-4">
                    <Link
                      href="https://scholarshiptop.com/account"
                      className="inline-flex items-center justify-center rounded-xl bg-[#FF7A1A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#E6670C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB27D] focus-visible:ring-offset-2"
                    >
                      Complete profile
                    </Link>
                  </div>
                </div>
              ) : null}
              {showClearFilters ? (
                <p className="mt-4">
                  <button
                    type="button"
                    onClick={clearListingFilters}
                    className="text-sm font-semibold text-teal-700 underline decoration-teal-600/40 underline-offset-2 transition hover:text-teal-900"
                  >
                    Clear filters
                  </button>
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="relative z-0 flex flex-col gap-4">
                {scholarships.map((s) => (
                  <ScholarshipCard
                    key={s.id}
                    scholarship={s}
                    isUnread={!viewedIds.includes(s.id)}
                    saved={savedIds.includes(s.id)}
                    onToggleSave={toggleSave}
                    onHide={
                      activeTab === 'ignored'
                        ? restoreScholarship
                        : ignoreScholarship
                    }
                    ignoreAction={activeTab === 'ignored' ? 'restore' : 'hide'}
                    showPersonalizedMatch={showPersonalizedMatchOnCards}
                    showCardActions={scholarshipTabShowsCardActions(activeTab)}
                    subscriptionLocked={isSubscriptionLocked}
                    listingTab={activeTab}
                    onSubscriptionLockedCategoryClick={
                      isSubscriptionLocked ? () => openSubscriptionOffer() : undefined
                    }
                  />
                ))}
              </div>
              <ScholarshipsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                buildHref={buildPageHref}
              />
            </>
          )}
          {postListingContent}
        </>
      </ScholarshipsTwoColumnLayout>

      <ScholarshipsMoreFiltersPanel
        open={moreFiltersOpen}
        onClose={() => setMoreFiltersOpen(false)}
        bounds={filterBounds}
        value={moreFiltersDraft ?? moreFiltersApplied ?? emptyMoreFiltersState}
        onChange={setMoreFiltersDraft}
        onClear={clearMoreFiltersDraft}
        onApply={applyMoreFilters}
        onSaveFilter={saveMoreFiltersPreset}
        saveFilterEnabled={saveFilterEnabled}
        previewCount={previewCount}
        previewCountLoading={previewCountLoading}
        previewCountFallback={lastKnownPreviewCount}
        locationOptions={[]}
        isAuthenticated={isAuthenticated}
        onGuestLockedAction={!isAuthenticated ? openRegistrationWall : undefined}
        hasSubscription={hasSubscription}
        onSubscriptionLockedAction={isSubscriptionLocked ? openSubscriptionOffer : undefined}
      />
      <ScholarshipRegistrationWallModal
        open={registrationWallOpen}
        onClose={closeRegistrationWall}
      />
      <ScholarshipSubscriptionOfferModal
        open={subscriptionOfferOpen}
        onClose={closeSubscriptionOffer}
      />
    </section>
  );
}

export default function ScholarshipsHubPageClient({
  isAuthenticated = false,
  hasSubscription = false,
  initialPayload = null,
  routeScope = null,
  leadContent = null,
  postListingContent = null
}: {
  isAuthenticated?: boolean;
  hasSubscription?: boolean;
  initialPayload?: InitialScholarshipsPayload | null;
  routeScope?: LongTailRouteScopePayload | null;
  leadContent?: ReactNode;
  postListingContent?: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <section className="min-h-screen bg-[#F3F7FA] px-4 py-12 text-slate-600 sm:px-5 md:py-12 lg:px-8">
          <div className="mx-auto max-w-5xl">Loading scholarships…</div>
        </section>
      }
    >
      <ScholarshipsPageInner
        isAuthenticated={isAuthenticated}
        hasSubscription={hasSubscription}
        initialPayload={initialPayload}
        routeScope={routeScope}
        leadContent={leadContent}
        postListingContent={postListingContent}
      />
    </Suspense>
  );
}
