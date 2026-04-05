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
import { Lock } from 'lucide-react';

import ScholarshipCard from '@/components/scholarships/ScholarshipCard';
import ScholarshipsListHeader from '@/components/scholarships/ScholarshipsListHeader';
import SubjectL2BrowseChips from '@/components/scholarships/SubjectL2BrowseChips';
import ScholarshipsMoreFiltersPanel from '@/components/scholarships/ScholarshipsMoreFiltersPanel';
import ScholarshipsPagination from '@/components/scholarships/ScholarshipsPagination';
import ScholarshipsSidebar from '@/components/scholarships/ScholarshipsSidebar';
import ScholarshipsTwoColumnLayout from '@/components/scholarships/ScholarshipsTwoColumnLayout';
import { ScholarshipsEmailConfirmationBanner } from '@/components/scholarships/ScholarshipsEmailConfirmationBanner';
import ScholarshipRegistrationWallModal from '@/components/scholarships/ScholarshipRegistrationWallModal';
import { scholarshipGuestLockIconClass } from '@/lib/constants/scholarshipActionUi';
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
  getSavedScholarshipIds,
  removeScholarship,
  saveScholarship
} from './savedScholarships';
import { getStartedScholarshipIds } from './startedScholarships';
import { getSubmittedScholarshipIds } from './submittedScholarships';
import { isGuestLockedSortOption, type SortOption } from './scholarshipSort';
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
  postScholarshipsMeta,
  postScholarshipsMatchCounts
} from './scholarshipListFetch';
import type { InitialScholarshipsPayload } from './scholarshipListServerPayload';
import type { LongTailRouteScopePayload } from './scholarshipListServerPayload';
import {
  moreFiltersFromJson,
  moreFiltersToJson
} from '@/lib/scholarships/scholarshipListApiCodec';
import type { ScholarshipListMeta } from '@/lib/scholarships/scholarshipListServer';
import { mergeMoreFilterStates } from '@/lib/scholarships/seoScholarshipListing';

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
  matches: 0,
  saved: 0,
  started: 0,
  submitted: 0,
  ignored: 0
};

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
  if (options.tab === 'best-matches') {
    sp.delete('tab');
  } else if (options.tab === 'matches') {
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

function ScholarshipsPageInner({
  isAuthenticated,
  initialPayload = null,
  routeScope = null,
  leadContent = null,
  postListingContent = null
}: {
  isAuthenticated: boolean;
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
  const [personalizedSidebarCounts, setPersonalizedSidebarCounts] = useState<{
    bestMatches: number;
    recommended: number;
  } | null>(null);
  const [registrationWallOpen, setRegistrationWallOpen] = useState(false);

  const openRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(true);
  }, []);

  const closeRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedIds([]);
      setIgnoredIds([]);
      setStartedIds([]);
      setSubmittedIds([]);
      return;
    }
    setSavedIds(getSavedScholarshipIds());
    setIgnoredIds(getIgnoredScholarshipIds());
    setStartedIds(getStartedScholarshipIds());
    setSubmittedIds(getSubmittedScholarshipIds());
  }, [isAuthenticated]);
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
  const skipNextApplyOnlyFetchRef = useRef(false);
  const previewRequestSeqRef = useRef(0);
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
   * — strip personalized tabs, category filters, advanced deadline, and guest-locked sort from the URL
   */
  useEffect(() => {
    if (isAuthenticated) return;
    const sp = new URLSearchParams(searchParamsString);
    const parsed = parseScholarshipListUrl(sp);
    const tab = sp.get('tab');
    const badTab =
      tab === 'best-matches' ||
      tab === 'recommended' ||
      tab === 'saved' ||
      tab === 'ignored';
    const needDefaultHubTab = !tab;
    const hasCats = parsed.categories.size > 0;
    const hasAdvDeadline = parsed.deadline != null && parsed.deadline !== 'any';
    const lockedGuestSort = isGuestLockedSortOption(parsed.sort);
    if (
      !badTab &&
      !needDefaultHubTab &&
      !hasCats &&
      !hasAdvDeadline &&
      !lockedGuestSort
    ) {
      return;
    }
    const resetPage = badTab || hasCats || hasAdvDeadline || lockedGuestSort;
    replaceListingParams({
      ...(needDefaultHubTab || badTab
        ? { tab: 'matches', scope: 'catalog' }
        : {}),
      ...(hasCats ? { categories: new Set() } : {}),
      ...(hasAdvDeadline ? { deadline: 'any' } : {}),
      ...(lockedGuestSort ? { sort: 'most_recent' } : {}),
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
      if (!isAuthenticated) {
        openRegistrationWall();
        return;
      }
      replaceListingParams({ categories: next, resetPage: true });
    },
    [isAuthenticated, openRegistrationWall, replaceListingParams]
  );

  const onSortChange = useCallback(
    (value: SortOption) => {
      if (!isAuthenticated && isGuestLockedSortOption(value)) {
        openRegistrationWall();
        return;
      }
      replaceListingParams({ sort: value, resetPage: true });
    },
    [isAuthenticated, openRegistrationWall, replaceListingParams]
  );

  useEffect(() => {
    setViewedIds(getViewedScholarshipIds());
  }, [pathname, activeTab]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'scholarshipViewedIds' || e.key === null) {
        setViewedIds(getViewedScholarshipIds());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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
  const routeBaseMoreFilters = useMemo(
    () =>
      routeScope?.baseMoreFilters
        ? moreFiltersFromJson(routeScope.baseMoreFilters, filterBounds)
        : null,
    [routeScope?.baseMoreFilters, filterBounds]
  );
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

  const sidebarCounts = useMemo((): ScholarshipSidebarCounts => {
    const base = listMeta?.sidebarCounts ?? EMPTY_SIDEBAR_COUNTS;
    const isCatalogBrowseTab =
      activeTab === 'matches' ||
      activeTab === 'best-matches' ||
      activeTab === 'recommended' ||
      activeTab === 'easy-apply';
    const syncedMatches =
      isCatalogBrowseTab && totalCount > 0
        ? totalCount
        : base.matches;
    if (!isAuthenticated) {
      return {
        ...base,
        bestMatches: 0,
        recommended: 0,
        matches: syncedMatches,
        saved: 0,
        ignored: 0,
        started: 0,
        submitted: 0
      };
    }
    return {
      ...base,
      bestMatches: personalizedSidebarCounts?.bestMatches ?? 0,
      recommended: personalizedSidebarCounts?.recommended ?? 0,
      matches: syncedMatches,
      saved: savedIds.length,
      started: startedIds.length,
      submitted: submittedIds.length,
      ignored: ignoredIds.length
    };
  }, [
    isAuthenticated,
    activeTab,
    totalCount,
    listMeta?.sidebarCounts,
    personalizedSidebarCounts,
    savedIds,
    startedIds,
    submittedIds,
    ignoredIds
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      setPersonalizedSidebarCounts(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const data = await postScholarshipsMatchCounts({
          ignored: userListIdsRef.current.ignored
        });
        if (cancelled) return;
        const counts = data.counts;
        setPersonalizedSidebarCounts({
          bestMatches: counts?.bestMatches ?? 0,
          recommended: counts?.recommended ?? 0
        });
      } catch {
        if (cancelled) return;
        setPersonalizedSidebarCounts((prev) => prev ?? { bestMatches: 0, recommended: 0 });
      }
    };
    run();
    const onVis = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isAuthenticated, ignoredIds]);

  const categoryCounts = useMemo(() => {
    if (listMeta?.categoryCounts) return listMeta.categoryCounts;
    const z = {} as Record<ScholarshipCategoryId, number>;
    for (const id of SCHOLARSHIP_CATEGORY_ORDER) z[id] = 0;
    return z;
  }, [listMeta?.categoryCounts]);

  const moreFiltersFingerprint = useMemo(() => {
    if (!moreFiltersApplied) return 'none';
    return JSON.stringify(moreFiltersToJson(moreFiltersApplied));
  }, [moreFiltersApplied]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / SCHOLARSHIPS_PAGE_SIZE)
  );
  const rawPageParam = new URLSearchParams(searchParamsString).get('page');
  const pageFromUrl = Math.max(1, Number.parseInt(rawPageParam ?? '1', 10));
  const currentPage = clampScholarshipListPage(rawPageParam, totalPages);

  useEffect(() => {
    let cancelled = false;
    const metaKey = `${activeTab}|${catalogListScope}|${searchParamsString}|${moreFiltersFingerprint}`;
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
        metaKeySynced.current = metaKey;
      }
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }
    if (skipNextApplyOnlyFetchRef.current) {
      skipNextApplyOnlyFetchRef.current = false;
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      try {
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
            metaKey,
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
        const data = await postScholarshipsList({
          searchParams: sp.toString(),
          moreFilters: effectiveMoreFilters
            ? moreFiltersToJson(effectiveMoreFilters)
            : undefined,
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
          metaKeySynced.current = metaKey;
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
    routeBaseMoreFilters
  ]);

  useEffect(() => {
    let cancelled = false;
    const metaKey = `${activeTab}|${catalogListScope}|${searchParamsString}|${moreFiltersFingerprint}`;
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
          moreFilters: moreFiltersToJson(
            routeBaseMoreFilters && moreFiltersApplied
              ? mergeMoreFilterStates(routeBaseMoreFilters, moreFiltersApplied)
              : (moreFiltersApplied ??
                  routeBaseMoreFilters ??
                  defaultMoreFiltersFromBounds(filterBounds))
          ),
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
    catalogListScope,
    moreFiltersApplied,
    routeScope,
    filterBounds,
    routeBaseMoreFilters
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
    const basis = moreFiltersApplied ?? emptyMoreFiltersState;
    setMoreFiltersDraft(cloneMoreFilters(basis));
    setMoreFiltersOpen(true);
  }, [moreFiltersApplied, emptyMoreFiltersState]);

  const applyMoreFilters = useCallback(() => {
    if (!isAuthenticated) {
      openRegistrationWall();
      return;
    }
    if (moreFiltersDraft) {
      const next = cloneMoreFilters(moreFiltersDraft);
      const nextSearchParams = buildScholarshipListSearchParams(
        new URLSearchParams(searchParamsString),
        {
          deadline: next.deadlinePreset,
          resetPage: true
        }
      ).toString();
      skipNextApplyOnlyFetchRef.current = nextSearchParams !== searchParamsString;
      setMoreFiltersApplied(next);
      replaceListingParams({
        deadline: next.deadlinePreset,
        resetPage: true
      });
    }
    setMoreFiltersOpen(false);
  }, [
    isAuthenticated,
    moreFiltersDraft,
    openRegistrationWall,
    replaceListingParams,
    searchParamsString
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
    const seq = ++previewRequestSeqRef.current;
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
          mergeMoreFilterStates(
            routeBaseMoreFilters ?? defaultMoreFiltersFromBounds(filterBounds),
            moreFiltersDraft
          )
        ),
        longTailLegacySlugs: routeScope?.longTailLegacySlugs ?? [],
        requiredSeoTags: routeScope?.requiredSeoTags ?? [],
        seoListingFallback: routeScope?.seoListingFallback,
        slugOnlyMoreFilters: routeScope?.slugOnlyMoreFilters
      })
        .then((r) => {
          if (cancelled || seq !== previewRequestSeqRef.current) return;
          setPreviewCount(r.total);
          setLastKnownPreviewCount(r.total);
          setPreviewCountLoading(false);
        })
        .catch(() => {
          if (cancelled || seq !== previewRequestSeqRef.current) return;
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

  const viewSegment = useMemo<'best' | 'all' | 'easy'>(() => {
    if (!isAuthenticated) {
      if (activeTab === 'easy-apply') return 'easy';
      if (activeTab === 'matches') return 'all';
      if (activeTab === 'best-matches' || activeTab === 'recommended') {
        return 'best';
      }
      return 'all';
    }
    return 'all';
  }, [isAuthenticated, activeTab]);

  const setViewBest = useCallback(() => {
    openRegistrationWall();
  }, [openRegistrationWall]);

  const setViewAll = useCallback(() => {
    replaceListingParams({
      scope: 'catalog',
      tab: 'matches',
      resetPage: true
    });
  }, [replaceListingParams]);

  const setViewEasy = useCallback(() => {
    openRegistrationWall();
  }, [openRegistrationWall]);

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
        return 'No best matches yet. Complete your profile or try the full catalog (All) for more results.';
      case 'recommended':
        return 'No recommended scholarships match right now. Try Matches for the full list.';
      case 'easy-apply':
        return 'No easy-apply scholarships in this set. Try broadening categories or More filters.';
      default:
        return 'No scholarships match your filters. Try adjusting search or filters.';
    }
  }, [activeTab, isAuthenticated]);

  const guestPersonalizedEmpty =
    !isAuthenticated &&
    (activeTab === 'best-matches' || activeTab === 'recommended');

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
            onGuestRestrictedNav={
              !isAuthenticated ? openRegistrationWall : undefined
            }
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
            onGuestSortBlocked={openRegistrationWall}
            listingViewControls={
              !isAuthenticated ? (
                <div
                  className="flex h-10 w-full min-w-0 items-stretch rounded-xl bg-gray-100 p-1"
                  role="group"
                  aria-label="Listing view"
                >
                  <button
                    type="button"
                    onClick={setViewBest}
                    title="Create a free account for personalized best matches"
                    className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-2 text-center text-sm font-semibold transition sm:gap-1.5 sm:px-3 ${
                      viewSegment === 'best'
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Lock
                      className={`h-3.5 w-3.5 shrink-0 ${
                        viewSegment === 'best'
                          ? 'text-white/85 stroke-white/85'
                          : scholarshipGuestLockIconClass
                      }`}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="min-w-0">Best match</span>
                  </button>
                  <button
                    type="button"
                    onClick={setViewAll}
                    className={`min-w-0 flex-1 rounded-lg px-2 text-center text-sm font-semibold transition sm:px-3 ${
                      viewSegment === 'all'
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={setViewEasy}
                    title="Create a free account to use Easy apply"
                    className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-2 text-center text-sm font-semibold transition sm:gap-1.5 sm:px-3 ${
                      viewSegment === 'easy'
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Lock
                      className={`h-3.5 w-3.5 shrink-0 ${
                        viewSegment === 'easy'
                          ? 'text-white/85 stroke-white/85'
                          : scholarshipGuestLockIconClass
                      }`}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="min-w-0">Easy apply</span>
                  </button>
                </div>
              ) : null
            }
          />

          {!isAuthenticated && viewSegment !== 'all' ? (
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
        applyPending={isLoading}
        previewCount={previewCount}
        previewCountLoading={previewCountLoading}
        previewCountFallback={lastKnownPreviewCount}
        locationOptions={[]}
      />
      <ScholarshipRegistrationWallModal
        open={registrationWallOpen}
        onClose={closeRegistrationWall}
      />
    </section>
  );
}

export default function ScholarshipsHubPageClient({
  isAuthenticated = false,
  initialPayload = null,
  routeScope = null,
  leadContent = null,
  postListingContent = null
}: {
  isAuthenticated?: boolean;
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
        initialPayload={initialPayload}
        routeScope={routeScope}
        leadContent={leadContent}
        postListingContent={postListingContent}
      />
    </Suspense>
  );
}
