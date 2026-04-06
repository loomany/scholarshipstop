'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';

import ScholarshipCard from '@/components/scholarships/ScholarshipCard';
import ScholarshipRegistrationWallModal from '@/components/scholarships/ScholarshipRegistrationWallModal';
import ScholarshipSubscriptionOfferModal from '@/components/scholarships/ScholarshipSubscriptionOfferModal';
import ScholarshipsListHeader from '@/components/scholarships/ScholarshipsListHeader';
import ScholarshipsMoreFiltersPanel from '@/components/scholarships/ScholarshipsMoreFiltersPanel';
import ScholarshipsPagination from '@/components/scholarships/ScholarshipsPagination';
import ScholarshipsSidebar from '@/components/scholarships/ScholarshipsSidebar';
import ScholarshipsTwoColumnLayout from '@/components/scholarships/ScholarshipsTwoColumnLayout';
import {
  SCHOLARSHIP_CATEGORY_LABELS,
  SCHOLARSHIP_CATEGORY_ORDER,
  type ScholarshipCategoryId
} from '@/app/scholarships/scholarshipCategories';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  getIgnoredScholarshipIds,
  addIgnoredScholarship,
  removeIgnoredScholarship
} from '@/app/scholarships/ignoredScholarships';
import {
  cloneMoreFilters,
  countMoreFilterSelections,
  defaultMoreFiltersFromBounds,
  type MoreFiltersState
} from '@/app/scholarships/moreFilters';
import {
  getReportedScholarshipIds,
  toggleReportedScholarship
} from '@/app/scholarships/reportedScholarships';
import {
  getSavedScholarshipIds,
  removeScholarship,
  saveScholarship
} from '@/app/scholarships/savedScholarships';
import { getStartedScholarshipIds } from '@/app/scholarships/startedScholarships';
import { getSubmittedScholarshipIds } from '@/app/scholarships/submittedScholarships';
import {
  type SortOption
} from '@/app/scholarships/scholarshipSort';
import type { ScholarshipSidebarCounts } from '@/app/scholarships/scholarshipTabs';
import { getViewedScholarshipIds } from '@/app/scholarships/viewedScholarships';
import {
  buildScholarshipCategoryPageSearchParams,
  clampScholarshipListPage,
  parseDeadlineFromParam,
  parseScholarshipListUrl,
  SCHOLARSHIPS_PAGE_SIZE
} from '@/app/scholarships/scholarshipListUrl';
import {
  normalizeScholarshipsListRows,
  postScholarshipsList,
  postScholarshipsCount
} from '@/app/scholarships/scholarshipListFetch';
import type { InitialScholarshipsPayload } from '@/app/scholarships/scholarshipListServerPayload';
import { moreFiltersToJson } from '@/lib/scholarships/scholarshipListApiCodec';
import type {
  ScholarshipListMeta,
  SeoListingFallbackMeta
} from '@/lib/scholarships/scholarshipListServer';

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

type Props = {
  categorySlug: string;
  pageTitle: string;
  isAuthenticated?: boolean;
  hasSubscription?: boolean;
  initialPayload?: InitialScholarshipsPayload | null;
};

/** SEO category POST must not send saved/ignored/started/submitted — they skew SQL / fallback. */
const SEO_LIST_FETCH_ID_LISTS: string[] = [];
const LOCKED_CATEGORY_SLUGS_FOR_UNSUBSCRIBED = new Set([
  'no-essay',
  'easy-apply',
  'quick-apply',
  'few-requirements',
  'no_essay',
  'easy_apply',
  'quick_apply',
  'few_requirements'
]);

function buildCategoryListingSearchParams(options: {
  base: URLSearchParams;
  page: number;
  categorySlug: string;
  meta: boolean;
  saved: string[];
  ignored: string[];
  started: string[];
  submitted: string[];
}): URLSearchParams {
  const sp = new URLSearchParams(options.base.toString());
  sp.set('category_page', options.categorySlug);
  if (options.page > 1) sp.set('page', String(options.page));
  else sp.delete('page');
  sp.set('limit', String(SCHOLARSHIPS_PAGE_SIZE));
  if (options.meta) sp.set('meta', '1');
  else sp.delete('meta');
  sp.delete('tab');
  if (options.saved.length) sp.set('saved', options.saved.join(','));
  else sp.delete('saved');
  if (options.ignored.length) sp.set('ignored', options.ignored.join(','));
  else sp.delete('ignored');
  if (options.started.length) sp.set('started', options.started.join(','));
  else sp.delete('started');
  if (options.submitted.length) sp.set('submitted', options.submitted.join(','));
  else sp.delete('submitted');
  sp.set('scope', 'catalog');
  return sp;
}

export default function ScholarshipCategoryPageClient({
  categorySlug,
  pageTitle,
  isAuthenticated = false,
  hasSubscription = false,
  initialPayload = null
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const parsedList = useMemo(
    () => parseScholarshipListUrl(new URLSearchParams(searchParamsString)),
    [searchParamsString]
  );
  const sortBy = parsedList.sort;
  const appliedCategoryIds = parsedList.categories;

  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>(
    initialPayload?.result.scholarships ?? []
  );
  const [totalCount, setTotalCount] = useState(initialPayload?.result.total ?? 0);
  const [listMeta, setListMeta] = useState<ScholarshipListMeta | null>(
    initialPayload?.result.meta ?? null
  );
  const [isLoading, setIsLoading] = useState(initialPayload == null);
  const [hasError, setHasError] = useState(false);
  const [query, setQuery] = useState(parsedList.q);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [reportedIds, setReportedIds] = useState<string[]>([]);
  const [startedIds, setStartedIds] = useState<string[]>([]);
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [moreFiltersApplied, setMoreFiltersApplied] =
    useState<MoreFiltersState | null>(null);
  const [moreFiltersDraft, setMoreFiltersDraft] =
    useState<MoreFiltersState | null>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const [seoFallbackMeta, setSeoFallbackMeta] =
    useState<SeoListingFallbackMeta | null>(null);
  const [registrationWallOpen, setRegistrationWallOpen] = useState(false);
  const [subscriptionOfferOpen, setSubscriptionOfferOpen] = useState(false);
  const isSubscriptionLocked = isAuthenticated && !hasSubscription;
  const isLockedPremiumCategory = useMemo(() => {
    const normalized = categorySlug.trim().toLowerCase().replace(/_/g, '-');
    return (
      isSubscriptionLocked &&
      LOCKED_CATEGORY_SLUGS_FOR_UNSUBSCRIBED.has(normalized)
    );
  }, [categorySlug, isSubscriptionLocked]);

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
  useEffect(() => {
    if (!isLockedPremiumCategory) return;
    openSubscriptionOffer();
  }, [isLockedPremiumCategory, openSubscriptionOffer]);

  const metaKeySynced = useRef('');
  const listFetchSeqRef = useRef(0);
  const prevSlugRef = useRef<string | null>(null);
  const initialRequestKeyRef = useRef(initialPayload?.requestKey ?? null);

  const replaceListingParams = useCallback(
    (
      patch: Parameters<typeof buildScholarshipCategoryPageSearchParams>[1],
      options?: { scroll?: boolean }
    ) => {
      const p = buildScholarshipCategoryPageSearchParams(
        new URLSearchParams(searchParams.toString()),
        patch
      );
      const qs = p.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      router.replace(url, { scroll: options?.scroll ?? false });
    },
    [pathname, router, searchParams]
  );

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
    setReportedIds(getReportedScholarshipIds());
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

  useEffect(() => {
    setViewedIds(getViewedScholarshipIds());
  }, [pathname]);

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

  const sidebarCounts = useMemo((): ScholarshipSidebarCounts => {
    const base = listMeta?.sidebarCounts ?? EMPTY_SIDEBAR_COUNTS;
    if (!isAuthenticated) {
      return {
        ...base,
        bestMatches: 0,
        recommended: 0,
        saved: 0,
        ignored: 0,
        started: 0,
        submitted: 0
      };
    }
    return {
      ...base,
      saved: savedIds.length,
      started: startedIds.length,
      submitted: submittedIds.length,
      ignored: ignoredIds.length
    };
  }, [
    isAuthenticated,
    listMeta?.sidebarCounts,
    savedIds.length,
    startedIds.length,
    submittedIds.length,
    ignoredIds.length
  ]);

  const categoryCounts = useMemo(() => {
    if (listMeta?.categoryCounts) return listMeta.categoryCounts;
    const z = {} as Record<ScholarshipCategoryId, number>;
    for (const id of SCHOLARSHIP_CATEGORY_ORDER) z[id] = 0;
    return z;
  }, [listMeta?.categoryCounts]);

  useEffect(() => {
    if (!listMeta) return;
    const slugChanged = prevSlugRef.current !== categorySlug;
    prevSlugRef.current = categorySlug;
    setMoreFiltersApplied((prev) => {
      if (!slugChanged && prev) return prev;
      const next = defaultMoreFiltersFromBounds(listMeta.filterBounds);
      const d = parseDeadlineFromParam(
        new URLSearchParams(searchParamsString).get('deadline')
      );
      if (d && d !== 'any') next.deadlinePreset = d;
      return next;
    });
  }, [categorySlug, listMeta, searchParamsString]);

  const seoFallbackActive = Boolean(seoFallbackMeta?.used);
  const showEmptyState =
    !isLoading &&
    !hasError &&
    scholarships.length === 0 &&
    !seoFallbackActive;
  const listTotalForUi =
    isLoading || showEmptyState
      ? totalCount
      : Math.max(totalCount, scholarships.length);

  const totalPages = Math.max(1, Math.ceil(listTotalForUi / SCHOLARSHIPS_PAGE_SIZE));
  const rawPageParam = new URLSearchParams(searchParamsString).get('page');
  const pageFromUrl = Math.max(1, Number.parseInt(rawPageParam ?? '1', 10));
  const currentPage = clampScholarshipListPage(rawPageParam, totalPages);

  useEffect(() => {
    if (isLockedPremiumCategory) {
      setIsLoading(false);
      setHasError(false);
      setScholarships([]);
      setTotalCount(0);
      return;
    }
    let cancelled = false;
    const seq = ++listFetchSeqRef.current;
    const metaKey = `cat:${categorySlug}`;
    const includeMeta = metaKey !== metaKeySynced.current;
    const currentRequestKey = `category:${categorySlug}:${searchParamsString}`;
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

    const run = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        const sp = buildCategoryListingSearchParams({
          base: new URLSearchParams(searchParamsString),
          page: pageFromUrl,
          categorySlug,
          meta: includeMeta,
          saved: SEO_LIST_FETCH_ID_LISTS,
          ignored: SEO_LIST_FETCH_ID_LISTS,
          started: SEO_LIST_FETCH_ID_LISTS,
          submitted: SEO_LIST_FETCH_ID_LISTS
        });
        const data = await postScholarshipsList({
          searchParams: sp.toString(),
          moreFilters:
            moreFiltersApplied != null
              ? moreFiltersToJson(moreFiltersApplied)
              : undefined,
          longTailLegacySlugs: [],
          seoListingFallback: true
        });
        if (cancelled || seq !== listFetchSeqRef.current) return;
        const rows = normalizeScholarshipsListRows(data);
        // eslint-disable-next-line no-console -- temporary SEO fallback debug
        console.log({
          results: rows.length,
          total: data.total,
          fallbackUsed: data.seoFallback?.used,
          tier: data.seoFallback?.tier
        });
        setScholarships(rows);
        setTotalCount(data.total);
        setSeoFallbackMeta(data.seoFallback ?? null);
        if (
          typeof data.page === 'number' &&
          data.page >= 1 &&
          data.page !== pageFromUrl
        ) {
          replaceListingParams({ page: data.page, resetPage: false });
        }
        if (data.meta) {
          setListMeta(data.meta);
          metaKeySynced.current = metaKey;
        }
      } catch {
        if (!cancelled && seq === listFetchSeqRef.current) setHasError(true);
      } finally {
        if (!cancelled && seq === listFetchSeqRef.current) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    searchParamsString,
    pageFromUrl,
    categorySlug,
    moreFiltersApplied,
    replaceListingParams,
    isLockedPremiumCategory
  ]);

  useEffect(() => {
    if (isLoading || listTotalForUi === 0) return;
    const requested = Number.parseInt(rawPageParam ?? '1', 10);
    const valid = clampScholarshipListPage(rawPageParam, totalPages);
    if (!Number.isFinite(requested) || requested < 1 || valid !== requested) {
      replaceListingParams({ page: valid, resetPage: false });
    }
  }, [
    isLoading,
    listTotalForUi,
    totalPages,
    rawPageParam,
    replaceListingParams
  ]);

  const listStart = (currentPage - 1) * SCHOLARSHIPS_PAGE_SIZE;

  const openMoreFilters = useCallback(() => {
    const basis =
      moreFiltersApplied ?? defaultMoreFiltersFromBounds(filterBounds);
    setMoreFiltersDraft(cloneMoreFilters(basis));
    setMoreFiltersOpen(true);
  }, [filterBounds, moreFiltersApplied]);

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
    setMoreFiltersDraft(defaultMoreFiltersFromBounds(filterBounds));
  }, [filterBounds]);

  useEffect(() => {
    if (!moreFiltersOpen || !moreFiltersDraft) {
      setPreviewCount(0);
      return;
    }
    const t = setTimeout(() => {
      const sp = buildCategoryListingSearchParams({
        base: new URLSearchParams(searchParamsString),
        page: 1,
        categorySlug,
        meta: false,
        saved: SEO_LIST_FETCH_ID_LISTS,
        ignored: SEO_LIST_FETCH_ID_LISTS,
        started: SEO_LIST_FETCH_ID_LISTS,
        submitted: SEO_LIST_FETCH_ID_LISTS
      });
      postScholarshipsCount({
        searchParams: sp.toString(),
        moreFilters: moreFiltersToJson(moreFiltersDraft),
        longTailLegacySlugs: [],
        seoListingFallback: true
      })
        .then((r) => setPreviewCount(r.total))
        .catch(() => setPreviewCount(0));
    }, 320);
    return () => clearTimeout(t);
  }, [
    moreFiltersDraft,
    moreFiltersOpen,
    searchParamsString,
    categorySlug
  ]);

  const buildPageHref = useCallback(
    (page: number) => {
      const p = buildScholarshipCategoryPageSearchParams(
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
    const d = defaultMoreFiltersFromBounds(filterBounds);
    if (moreFiltersApplied.deadlinePreset !== d.deadlinePreset) return true;
    if (
      moreFiltersApplied.amountMin !== d.amountMin ||
      moreFiltersApplied.amountMax !== d.amountMax
    ) {
      return true;
    }
    if (
      moreFiltersApplied.applicantsMin !== d.applicantsMin ||
      moreFiltersApplied.applicantsMax !== d.applicantsMax
    ) {
      return true;
    }
    if (moreFiltersApplied.includeRequirementTypes.size > 0) return true;
    const c = moreFiltersApplied.dataCompleteness;
    if (c.low || c.medium || c.high || c.verified) return true;
    if (moreFiltersApplied.includeEligibility.size > 0) return true;
    if (moreFiltersApplied.includeEducationLevels.size > 0) return true;
    if (moreFiltersApplied.includeGpaBuckets.size > 0) return true;
    if (moreFiltersApplied.includeLocationLabels.size > 0) return true;
    if (moreFiltersApplied.includeEasyApply.size > 0) return true;
    if (moreFiltersApplied.filterStateInput.trim() !== '') return true;
    const po = moreFiltersApplied.payout;
    if (po.college || po.student || po.nonMonetary || po.notStated) return true;
    return false;
  }, [moreFiltersApplied, filterBounds]);

  const moreFiltersActiveCount = useMemo(() => {
    if (!moreFiltersApplied) return 0;
    return countMoreFilterSelections(moreFiltersApplied, filterBounds);
  }, [moreFiltersApplied, filterBounds]);

  const activeListingChips = useMemo(() => {
    const chips: { id: string; label: string; onDismiss: () => void }[] = [];
    const qv = parsedList.q.trim();
    if (qv) {
      const short = qv.length > 48 ? `${qv.slice(0, 48)}…` : qv;
      chips.push({
        id: 'q',
        label: short,
        onDismiss: () => {
          setQuery('');
          replaceListingParams({ q: '', resetPage: true });
        }
      });
    }
    appliedCategoryIds.forEach((id) => {
      chips.push({
        id: `cat:${id}`,
        label: SCHOLARSHIP_CATEGORY_LABELS[id],
        onDismiss: () => {
          const next = new Set(appliedCategoryIds);
          next.delete(id);
          onApplyCategories(next);
        }
      });
    });
    if (moreFiltersApplied && moreFiltersOffDefault) {
      const n = countMoreFilterSelections(moreFiltersApplied, filterBounds);
      if (n > 0) {
        chips.push({
          id: 'more-filters',
          label: `Advanced filters (${n})`,
          onDismiss: () =>
            setMoreFiltersApplied(defaultMoreFiltersFromBounds(filterBounds))
        });
      }
    }
    return chips;
  }, [
    parsedList.q,
    appliedCategoryIds,
    moreFiltersApplied,
    moreFiltersOffDefault,
    filterBounds,
    onApplyCategories,
    replaceListingParams
  ]);

  const clearAllListingChips = useCallback(() => {
    if (queryDebounceRef.current) {
      clearTimeout(queryDebounceRef.current);
      queryDebounceRef.current = null;
    }
    setQuery('');
    replaceListingParams({ q: '', categories: new Set(), resetPage: true });
    setMoreFiltersApplied(defaultMoreFiltersFromBounds(filterBounds));
  }, [filterBounds, replaceListingParams]);

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
    setMoreFiltersApplied(defaultMoreFiltersFromBounds(filterBounds));
    router.replace(pathname, { scroll: false });
  }, [router, pathname, filterBounds]);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      if (prev.includes(id)) {
        return removeScholarship(id);
      }
      return saveScholarship(id);
    });
  };

  const ignoreScholarship = useCallback((id: string) => {
    setIgnoredIds(addIgnoredScholarship(id));
  }, []);

  const toggleReport = useCallback((id: string) => {
    setReportedIds(toggleReportedScholarship(id));
  }, []);

  const resultCountForHeader = isLoading ? null : listTotalForUi;
  const showingFrom =
    !isLoading && listTotalForUi > 0 ? listStart + 1 : null;
  const showingTo =
    !isLoading && listTotalForUi > 0
      ? Math.min(listStart + SCHOLARSHIPS_PAGE_SIZE, listTotalForUi)
      : null;

  const showClearFilters =
    showEmptyState &&
    (hasListingParams || moreFiltersOffDefault || query.trim().length > 0);

  // eslint-disable-next-line no-console -- temporary SEO list diagnostics
  console.log('RENDER STATE', {
    scholarshipsLength: scholarships.length,
    totalCount,
    hasError,
    isLoading,
    seoFallbackMeta,
    showEmptyState
  });

  return (
    <section className="min-h-screen bg-[#F3F7FA] px-4 py-8 text-left text-zinc-900 sm:px-5 md:py-12 lg:px-8">
      <ScholarshipsTwoColumnLayout
        maxWidth="listing"
        lead={
          <h1 className="min-w-0 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-[2rem] lg:leading-tight">
            {pageTitle}
          </h1>
        }
        sidebar={
          <ScholarshipsSidebar
            counts={sidebarCounts}
            matchesNewIndicator={null}
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
            pageTitle={pageTitle}
            omitHeadlineBlock
            loadingCountText="Loading scholarships…"
            categoriesDisabled={!isLoading && showEmptyState}
            moreFiltersActiveCount={moreFiltersActiveCount}
            activeListingChips={activeListingChips}
            onClearAllListingChips={
              activeListingChips.length > 0 ? clearAllListingChips : undefined
            }
            isAuthenticated={isAuthenticated}
            hasSubscription={hasSubscription}
            onGuestSortBlocked={!isAuthenticated ? openRegistrationWall : undefined}
            onSubscriptionSortBlocked={
              isSubscriptionLocked ? openSubscriptionOffer : undefined
            }
            onGuestLockedAction={!isAuthenticated ? openRegistrationWall : undefined}
          />

          {isLockedPremiumCategory ? (
            <div className="max-w-3xl rounded-xl border border-zinc-200 bg-white px-5 py-10 text-left text-slate-600 shadow-sm">
              <div className="flex items-start gap-3">
                <Lock
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#FF7A1A]"
                  aria-hidden
                />
                <div>
                  <p className="text-base font-semibold text-zinc-900">
                    This category is available for subscribers only.
                  </p>
                  <p className="mt-2 text-sm text-zinc-600">
                    Start your free access to unlock No Essay, Easy Apply, Quick Apply, and Few Requirements categories.
                  </p>
                  <button
                    type="button"
                    onClick={openSubscriptionOffer}
                    className="mt-4 inline-flex items-center rounded-xl bg-[#FF7A1A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E6670C]"
                  >
                    Get Free Access
                  </button>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="text-slate-600">Loading scholarships...</div>
          ) : hasError ? (
            <div className="text-red-600">Failed to load scholarships</div>
          ) : showEmptyState ? (
            <div className="max-w-3xl rounded-xl border border-zinc-200 bg-white px-5 py-10 text-left text-slate-600 shadow-sm">
              <p className="text-base font-medium text-zinc-800">
                No scholarships in this category yet, or none match your filters.
              </p>
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
              {seoFallbackMeta?.used ? (
                <div
                  className="mb-4 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950"
                  role="status"
                >
                  No exact matches found — showing closest scholarships
                  instead.
                </div>
              ) : null}
              <div className="relative z-0 flex flex-col gap-4">
                {scholarships.map((s) => (
                  <ScholarshipCard
                    key={s.id}
                    scholarship={s}
                    isUnread={!viewedIds.includes(s.id)}
                    saved={savedIds.includes(s.id)}
                    onToggleSave={toggleSave}
                    onHide={ignoreScholarship}
                    ignoreAction="hide"
                    reported={reportedIds.includes(s.id)}
                    onToggleReport={toggleReport}
                    subscriptionLocked={isSubscriptionLocked}
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
        </>
      </ScholarshipsTwoColumnLayout>

      <ScholarshipsMoreFiltersPanel
        open={moreFiltersOpen}
        onClose={() => setMoreFiltersOpen(false)}
        bounds={filterBounds}
        value={
          moreFiltersDraft ?? defaultMoreFiltersFromBounds(filterBounds)
        }
        onChange={setMoreFiltersDraft}
        onClear={clearMoreFiltersDraft}
        onApply={applyMoreFilters}
        previewCount={previewCount}
        previewCountLoading={false}
        previewCountFallback={null}
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
