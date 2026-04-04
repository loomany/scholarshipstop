'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import ScholarshipCard from '@/components/scholarships/ScholarshipCard';
import ScholarshipRegistrationWallModal from '@/components/scholarships/ScholarshipRegistrationWallModal';
import {
  SeoScholarshipHero,
  SeoScholarshipPostListingSeo
} from '@/components/scholarships/SeoScholarshipListingChrome';
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
  countMoreFilterDeltaFromBaseline,
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
  buildListingBaselineMoreFilters,
  buildSeoSlugOnlyMoreFilters,
  requiredSeoTagsForListingPath,
  type LongTailListingMode
} from '@/lib/scholarships/seoScholarshipListing';
import type { InitialScholarshipsPayload } from '@/app/scholarships/scholarshipListServerPayload';
import type { SeoListingPageData } from '@/lib/scholarships/seoScholarshipPageData';
import type { SeoListingFallbackMeta } from '@/lib/scholarships/scholarshipListServer';
import { SeoRelatedScholarshipsSection } from '@/components/scholarships/SeoRelatedScholarshipsSection';
import {
  isGuestLockedSortOption,
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
import { moreFiltersToJson } from '@/lib/scholarships/scholarshipListApiCodec';
import type { ScholarshipListMeta } from '@/lib/scholarships/scholarshipListServer';
import type { LongTailSlug } from '@/app/scholarships/scholarshipLongTailPresets';

function seoCopyToLines(
  v: string | string[] | null | undefined
): string[] | null {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const a = v.map((x) => x.trim()).filter(Boolean);
    return a.length ? a : null;
  }
  const t = v.trim();
  if (!t) return null;
  if (t.includes('\n')) {
    const parts = t
      .split(/\n+/)
      .map((l) => l.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
    return parts.length ? parts : [t];
  }
  return [t];
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

type Props = {
  listingMode: LongTailListingMode;
  initialPayload?: InitialScholarshipsPayload | null;
  pageTitle: string;
  /** When false, show hub-style lock affordances and gate category/sort/filter apply. */
  isAuthenticated?: boolean;
  introParagraph?: string | null;
  supportingParagraph?: string | null;
  /** Optional mid-page paragraph (e.g. AI “related” bridge). */
  relatedIntroParagraph?: string | null;
  howToUseText?: string | string[] | null;
  whoForText?: string | string[] | null;
  faqItems?: { question: string; answer: string }[];
  pageData?: SeoListingPageData | null;
  qualityBucket?: string | null;
  canonicalTarget?: string | null;
  updatedAt?: string | null;
};

function moreFiltersStateEquals(a: MoreFiltersState, b: MoreFiltersState): boolean {
  if (a.deadlinePreset !== b.deadlinePreset) return false;
  if (a.amountMin !== b.amountMin || a.amountMax !== b.amountMax) return false;
  if (a.applicantsMin !== b.applicantsMin || a.applicantsMax !== b.applicantsMax)
    return false;
  const ae = Array.from(a.excludeRequirementTypes).sort().join('\0');
  const be = Array.from(b.excludeRequirementTypes).sort().join('\0');
  if (ae !== be) return false;
  const ca = a.dataCompleteness;
  const cb = b.dataCompleteness;
  if (
    ca.low !== cb.low ||
    ca.medium !== cb.medium ||
    ca.high !== cb.high ||
    ca.verified !== cb.verified
  ) {
    return false;
  }
  const setEq = (sa: Set<string>, sb: Set<string>) =>
    Array.from(sa).sort().join('\0') === Array.from(sb).sort().join('\0');
  if (!setEq(a.includeEligibility, b.includeEligibility)) return false;
  if (!setEq(a.includeEducationLevels, b.includeEducationLevels)) return false;
  if (!setEq(a.includeGpaBuckets, b.includeGpaBuckets)) return false;
  if (!setEq(a.includeLocationLabels, b.includeLocationLabels)) return false;
  if (!setEq(a.includeEasyApply, b.includeEasyApply)) return false;
  if (a.filterStateInput.trim() !== b.filterStateInput.trim()) return false;
  const pa = a.payout;
  const pb = b.payout;
  return (
    pa.college === pb.college &&
    pa.student === pb.student &&
    pa.nonMonetary === pb.nonMonetary &&
    pa.notStated === pb.notStated
  );
}

function listingRouteKey(mode: LongTailListingMode): string {
  return mode.type === 'legacy' ? mode.slug : mode.canonicalPath;
}

function longTailLegacySlugList(mode: LongTailListingMode): LongTailSlug[] {
  if (mode.type === 'legacy') return [mode.slug];
  return (mode.entry.legacyBaseSlugs ?? []) as LongTailSlug[];
}

/** SEO catalog POST must not send saved/ignored/started/submitted — they skew counts and SQL. */
const SEO_LIST_FETCH_ID_LISTS: string[] = [];

function buildLongTailListingSearchParams(options: {
  base: URLSearchParams;
  page: number;
  legacySlugs: string[];
  meta: boolean;
  saved: string[];
  ignored: string[];
  started: string[];
  submitted: string[];
}): URLSearchParams {
  const sp = new URLSearchParams(options.base.toString());
  if (options.page > 1) sp.set('page', String(options.page));
  else sp.delete('page');
  sp.set('limit', String(SCHOLARSHIPS_PAGE_SIZE));
  if (options.meta) sp.set('meta', '1');
  else sp.delete('meta');
  /** Hub default when `tab` is missing is `best-matches`, which returns 0 rows for guests (no match index). Catalog SEO listings must use `matches` (“All”) so SQL + seo fallback run. */
  sp.set('tab', 'matches');
  if (options.legacySlugs.length)
    sp.set('long_tail', options.legacySlugs.join(','));
  else sp.delete('long_tail');
  sp.set('scope', 'catalog');
  if (options.saved.length) sp.set('saved', options.saved.join(','));
  else sp.delete('saved');
  if (options.ignored.length) sp.set('ignored', options.ignored.join(','));
  else sp.delete('ignored');
  if (options.started.length) sp.set('started', options.started.join(','));
  else sp.delete('started');
  if (options.submitted.length) sp.set('submitted', options.submitted.join(','));
  else sp.delete('submitted');
  return sp;
}

export default function LongTailScholarshipsPageClient({
  listingMode,
  initialPayload = null,
  pageTitle,
  isAuthenticated = false,
  introParagraph = null,
  supportingParagraph = null,
  relatedIntroParagraph = null,
  howToUseText = null,
  whoForText = null,
  faqItems,
  pageData = null,
  qualityBucket = null,
  canonicalTarget = null,
  updatedAt = null
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
    useState<SeoListingFallbackMeta | null>(initialPayload?.result.seoFallback ?? null);
  const [registrationWallOpen, setRegistrationWallOpen] = useState(false);

  const openRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(true);
  }, []);

  const closeRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(false);
  }, []);

  const metaKeySynced = useRef('');
  const listFetchSeqRef = useRef(0);
  const legacySlugs = useMemo(
    () => longTailLegacySlugList(listingMode),
    [listingMode]
  );
  const routeKey = listingRouteKey(listingMode);
  const initialRequestKeyRef = useRef(initialPayload?.requestKey ?? null);

  const requiredSeoTagsPayload = useMemo((): string[] | undefined => {
    const path =
      listingMode.type === 'manifest'
        ? listingMode.canonicalPath
        : listingMode.type === 'legacy'
          ? listingMode.slug
          : '';
    const tags = path ? requiredSeoTagsForListingPath(path) : [];
    return tags.length > 0 ? tags : undefined;
  }, [listingMode]);

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

  const presetMoreBaseline = useMemo(() => {
    if (!listMeta) return null;
    return buildListingBaselineMoreFilters(listMeta.filterBounds, listingMode);
  }, [listMeta, listingMode]);

  const slugOnlyMoreJson = useMemo(() => {
    if (!listMeta) return undefined;
    try {
      return moreFiltersToJson(
        buildSeoSlugOnlyMoreFilters(listMeta.filterBounds, listingMode)
      );
    } catch {
      return undefined;
    }
  }, [listMeta, listingMode]);

  /** Applied filters for API; null → server uses defaults from DB bounds. */
  const effectiveMoreFilters = moreFiltersApplied ?? presetMoreBaseline;

  const prevRouteKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!listMeta) return;
    const routeChanged = prevRouteKeyRef.current !== routeKey;
    prevRouteKeyRef.current = routeKey;
    setMoreFiltersApplied((prev) => {
      if (!routeChanged && prev) return prev;
      return buildListingBaselineMoreFilters(listMeta.filterBounds, listingMode);
    });
  }, [routeKey, listMeta, listingMode]);

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
    let cancelled = false;
    const seq = ++listFetchSeqRef.current;
    const metaKey = `lt:${routeKey}`;
    const includeMeta = metaKey !== metaKeySynced.current;
    const currentRequestKey = `long_tail:${routeKey}:${searchParamsString}`;
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
        const sp = buildLongTailListingSearchParams({
          base: new URLSearchParams(searchParamsString),
          page: pageFromUrl,
          legacySlugs,
          meta: includeMeta,
          saved: SEO_LIST_FETCH_ID_LISTS,
          ignored: SEO_LIST_FETCH_ID_LISTS,
          started: SEO_LIST_FETCH_ID_LISTS,
          submitted: SEO_LIST_FETCH_ID_LISTS
        });
        const data = await postScholarshipsList({
          searchParams: sp.toString(),
          moreFilters:
            effectiveMoreFilters != null
              ? moreFiltersToJson(effectiveMoreFilters)
              : undefined,
          longTailLegacySlugs: legacySlugs,
          seoListingFallback: true,
          slugOnlyMoreFilters: slugOnlyMoreJson,
          requiredSeoTags: requiredSeoTagsPayload
        });
        if (cancelled || seq !== listFetchSeqRef.current) return;
        const rows = normalizeScholarshipsListRows(data);
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
    routeKey,
    legacySlugs,
    moreFiltersApplied,
    presetMoreBaseline,
    slugOnlyMoreJson,
    requiredSeoTagsPayload,
    replaceListingParams
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
      moreFiltersApplied ??
      presetMoreBaseline ??
      defaultMoreFiltersFromBounds(filterBounds);
    setMoreFiltersDraft(cloneMoreFilters(basis));
    setMoreFiltersOpen(true);
  }, [moreFiltersApplied, presetMoreBaseline, filterBounds]);

  const applyMoreFilters = useCallback(() => {
    if (!isAuthenticated) {
      openRegistrationWall();
      return;
    }
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
    isAuthenticated,
    moreFiltersDraft,
    openRegistrationWall,
    replaceListingParams
  ]);

  const clearMoreFiltersDraft = useCallback(() => {
    if (presetMoreBaseline) {
      setMoreFiltersDraft(cloneMoreFilters(presetMoreBaseline));
    }
  }, [presetMoreBaseline]);

  useEffect(() => {
    if (!moreFiltersOpen || !moreFiltersDraft || !presetMoreBaseline) {
      setPreviewCount(0);
      return;
    }
    const t = setTimeout(() => {
      const sp = buildLongTailListingSearchParams({
        base: new URLSearchParams(searchParamsString),
        page: 1,
        legacySlugs,
        meta: false,
        saved: SEO_LIST_FETCH_ID_LISTS,
        ignored: SEO_LIST_FETCH_ID_LISTS,
        started: SEO_LIST_FETCH_ID_LISTS,
        submitted: SEO_LIST_FETCH_ID_LISTS
      });
      postScholarshipsCount({
        searchParams: sp.toString(),
        moreFilters: moreFiltersToJson(moreFiltersDraft),
        longTailLegacySlugs: legacySlugs,
        seoListingFallback: true,
        slugOnlyMoreFilters: slugOnlyMoreJson,
        requiredSeoTags: requiredSeoTagsPayload
      })
        .then((r) => setPreviewCount(r.total))
        .catch(() => setPreviewCount(0));
    }, 320);
    return () => clearTimeout(t);
  }, [
    moreFiltersDraft,
    moreFiltersOpen,
    presetMoreBaseline,
    searchParamsString,
    legacySlugs,
    slugOnlyMoreJson,
    requiredSeoTagsPayload
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

  const displayMoreFilters =
    effectiveMoreFilters ?? defaultMoreFiltersFromBounds(filterBounds);

  const moreFiltersOffDefault = useMemo(() => {
    if (!presetMoreBaseline) return false;
    return !moreFiltersStateEquals(displayMoreFilters, presetMoreBaseline);
  }, [displayMoreFilters, presetMoreBaseline]);

  const moreFiltersActiveCount = useMemo(
    () =>
      presetMoreBaseline
        ? countMoreFilterDeltaFromBaseline(
            displayMoreFilters,
            presetMoreBaseline
          )
        : 0,
    [displayMoreFilters, presetMoreBaseline]
  );

  const activeListingChips = useMemo(() => {
    const chips: { id: string; label: string; onDismiss: () => void }[] = [];
    const q = parsedList.q.trim();
    if (q) {
      const short = q.length > 48 ? `${q.slice(0, 48)}…` : q;
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
    if (
      presetMoreBaseline &&
      moreFiltersOffDefault &&
      moreFiltersActiveCount > 0
    ) {
      chips.push({
        id: 'more-filters',
        label: `Advanced filters (${moreFiltersActiveCount})`,
        onDismiss: () =>
          setMoreFiltersApplied(cloneMoreFilters(presetMoreBaseline))
      });
    }
    return chips;
  }, [
    parsedList.q,
    appliedCategoryIds,
    moreFiltersOffDefault,
    moreFiltersActiveCount,
    onApplyCategories,
    replaceListingParams,
    presetMoreBaseline
  ]);

  const clearAllListingChips = useCallback(() => {
    if (queryDebounceRef.current) {
      clearTimeout(queryDebounceRef.current);
      queryDebounceRef.current = null;
    }
    setQuery('');
    replaceListingParams({ q: '', categories: new Set(), resetPage: true });
    if (presetMoreBaseline) {
      setMoreFiltersApplied(cloneMoreFilters(presetMoreBaseline));
    }
  }, [presetMoreBaseline, replaceListingParams]);

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
    if (listMeta) {
      setMoreFiltersApplied(
        buildListingBaselineMoreFilters(listMeta.filterBounds, listingMode)
      );
    } else {
      setMoreFiltersApplied(null);
    }
    router.replace(pathname, { scroll: false });
  }, [router, pathname, listMeta, listingMode]);

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

  const emptyCopy =
    'No scholarships match your search or filters. Try adjusting them.';

  const howToUseLines = seoCopyToLines(howToUseText);
  const whoForLines = seoCopyToLines(whoForText);
  const isGoodSeoPage = qualityBucket === 'GOOD';
  const heroIntro = isGoodSeoPage ? introParagraph : null;
  const postSeoFaqItems = isGoodSeoPage ? faqItems : undefined;

  return (
    <section className="min-h-screen bg-[#F3F7FA] px-4 py-8 text-left text-zinc-900 sm:px-5 md:py-12 lg:px-8">
      <ScholarshipsTwoColumnLayout
        maxWidth="listing"
        lead={
          <SeoScholarshipHero
            heading={pageTitle}
            scholarshipCount={resultCountForHeader}
            listLoading={isLoading}
            introHtml={heroIntro}
            fallbackUsed={Boolean(seoFallbackMeta?.used)}
            thinListing={Boolean(seoFallbackMeta?.thinListing)}
            exactFilterMatchTotal={
              seoFallbackMeta?.used ? seoFallbackMeta.exactTotal : null
            }
            qualityBucket={qualityBucket}
            pageData={pageData}
            updatedAt={updatedAt}
            canonicalTarget={canonicalTarget}
          />
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
            pageTitle={pageTitle}
            introParagraph={null}
            omitHeadlineBlock
            loadingCountText="Loading scholarships…"
            listTab="matches"
            categoriesDisabled={!isLoading && showEmptyState}
            moreFiltersActiveCount={moreFiltersActiveCount}
            activeListingChips={activeListingChips}
            onClearAllListingChips={
              activeListingChips.length > 0 ? clearAllListingChips : undefined
            }
            isAuthenticated={isAuthenticated}
            onGuestSortBlocked={openRegistrationWall}
          />

          {isLoading ? (
            <div className="max-w-3xl text-slate-600">Loading scholarships…</div>
          ) : hasError ? (
            <div className="max-w-3xl text-red-600">
              Failed to load scholarships
            </div>
          ) : showEmptyState ? (
            <div className="max-w-3xl rounded-xl border border-zinc-200 bg-white px-5 py-8 text-left text-slate-600 shadow-sm">
              <p className="text-base font-medium text-zinc-800">{emptyCopy}</p>
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
              <div className="mt-6 text-sm">
                <Link
                  href="/scholarships"
                  className="font-medium text-teal-700 underline decoration-teal-600/35 underline-offset-2 hover:text-teal-900"
                >
                  Browse all USA scholarships
                </Link>
              </div>
              <SeoRelatedScholarshipsSection listingMode={listingMode} />
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
                  />
                ))}
              </div>
              <SeoRelatedScholarshipsSection
                listingMode={listingMode}
                className="mb-6"
              />
              <ScholarshipsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                buildHref={buildPageHref}
              />
            </>
          )}
          {!isLoading && !hasError ? (
            <SeoScholarshipPostListingSeo
              heading={pageTitle}
              supportingParagraph={isGoodSeoPage ? supportingParagraph : null}
              relatedIntroParagraph={isGoodSeoPage ? relatedIntroParagraph : null}
              howToUseLines={isGoodSeoPage ? howToUseLines : null}
              whoForLines={isGoodSeoPage ? whoForLines : null}
              faqItems={postSeoFaqItems}
              legacySeoSlug={
                listingMode.type === 'legacy' ? listingMode.slug : null
              }
              relatedMode={listingMode}
              pageData={pageData}
              qualityBucket={qualityBucket}
              updatedAt={updatedAt}
            />
          ) : null}
        </>
      </ScholarshipsTwoColumnLayout>

      <ScholarshipsMoreFiltersPanel
        open={moreFiltersOpen}
        onClose={() => setMoreFiltersOpen(false)}
        bounds={filterBounds}
        value={
          moreFiltersDraft ??
          presetMoreBaseline ??
          defaultMoreFiltersFromBounds(filterBounds)
        }
        onChange={setMoreFiltersDraft}
        onClear={clearMoreFiltersDraft}
        onApply={applyMoreFilters}
        previewCount={previewCount}
        locationOptions={[]}
        isAuthenticated={isAuthenticated}
      />
      <ScholarshipRegistrationWallModal
        open={registrationWallOpen}
        onClose={closeRegistrationWall}
      />
    </section>
  );
}
