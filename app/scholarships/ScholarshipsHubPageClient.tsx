'use client';

/**
 * Main scholarships directory (tabs, search, filters) at `/scholarships`.
 * Data: server-paginated POST /api/scholarships (no full catalog in memory).
 */

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ScholarshipsBrandLoading } from '@/components/scholarships/ScholarshipsBrandLoading';
import BestRecommendationWizard from '@/components/scholarships/BestRecommendationWizard';
import ScholarshipCard from '@/components/scholarships/ScholarshipCard';
import ScholarshipCatalogEntryLink from '@/components/scholarships/ScholarshipCatalogEntryLink';
import ScholarshipsListHeader from '@/components/scholarships/ScholarshipsListHeader';
import ScholarshipsMoreFiltersPanel from '@/components/scholarships/ScholarshipsMoreFiltersPanel';
import ScholarshipsPagination from '@/components/scholarships/ScholarshipsPagination';
import ScholarshipsSidebar from '@/components/scholarships/ScholarshipsSidebar';
import ScholarshipsTwoColumnLayout from '@/components/scholarships/ScholarshipsTwoColumnLayout';
import { ScholarshipsEmailConfirmationBanner } from '@/components/scholarships/ScholarshipsEmailConfirmationBanner';
import ScholarshipRegistrationWallModal, {
  type ScholarshipRegistrationWallContentMode
} from '@/components/scholarships/ScholarshipRegistrationWallModal';
import {
  SCHOLARSHIP_CATEGORY_ORDER,
  type ScholarshipCategoryId
} from './scholarshipCategories';
import type { Scholarship } from './scholarshipsData';
import {
  getIgnoredScholarshipIds,
  addIgnoredScholarship,
  removeIgnoredScholarship,
  IGNORED_SCHOLARSHIPS_KEY
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
  SAVED_FILTERS_STORAGE_KEY
} from '@/lib/scholarships/savedFiltersStorage';
import {
  deleteUserSavedScholarship,
  fetchUserSavedScholarshipIds,
  postUserSavedScholarship
} from './savedScholarshipsAccountApi';
import {
  getSavedScholarshipIds,
  removeScholarship,
  saveScholarship,
  SAVED_SCHOLARSHIPS_KEY
} from './savedScholarships';
import {
  getStartedScholarshipIds,
  STARTED_SCHOLARSHIPS_KEY
} from './startedScholarships';
import {
  getSubmittedScholarshipIds,
  SUBMITTED_SCHOLARSHIPS_KEY
} from './submittedScholarships';
import { useCurrentUserScholarshipMatchProfile } from './useCurrentUserScholarshipMatchProfile';
import { type SortOption } from './scholarshipSort';
import {
  LEGACY_BEST_RECOMMENDATION_TAB_ID,
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
  SCHOLARSHIPS_HUB_INTERNATIONAL_FRIENDLY_HREF,
  buildScholarshipTabHref,
  clampScholarshipListPage,
  parseDeadlineFromParam,
  type ScholarshipAudienceParam,
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
import { applyListingMetaGuestPatches } from '@/lib/scholarships/applyListingMetaGuestPatches';
import { buildHubTabPresetMoreFilters } from '@/lib/scholarships/hubTabPresetMoreFilters';
import { mergeMoreFilterStates } from '@/lib/scholarships/seoScholarshipListing';
import {
  LANDING_QUIZ_HUB_SEED_KEY,
  SCHOLARSHIP_HUB_SKIP_AUTO_LANDING_SEED_ONCE_KEY
} from '@/lib/scholarships/landingQuizHubSession';
import {
  loadGuestLandingQuizDraftForHubReEdit,
  tryBuildProfileSeedFromCompletedLandingQuiz,
  tryBuildProfileSeedFromPendingLandingSession
} from '@/lib/onboarding/mergeLandingQuizIntoOnboardingDraft';
import {
  BEST_RECOMMENDATION_WIZARD_DRAFT_KEY,
  bestRecommendationWizardHasUsableData,
  bridgeBestRecommendationWizardToOnboardingDraft,
  buildBestRecommendationWizardSeed,
  emptyBestRecommendationWizardDraft,
  loadBestRecommendationWizardDraft,
  saveBestRecommendationWizardDraft,
  type BestRecommendationWizardStore
} from '@/lib/onboarding/bestRecommendationWizardDraft';
import {
  mergeBestRecommendationFiltersFromProfile,
  stripHubProfileHardMatchMoreFilters,
  type ScholarshipProfileFilterSeed
} from '@/lib/scholarships/profileFilterDefaults';
import { applyProfileMatchPercentToScholarships } from '@/lib/scholarships/profileMatchBadge';
import { storageKeyMatchesBase } from '@/app/scholarships/userScopedStorage';
import { toast } from '@/components/ui/Toasts/use-toast';
import { buildScholarshipProfileFormPatch } from '@/lib/account/scholarshipProfileFormPatch';
import { pickAllowedProfilesUpsertFields } from '@/lib/onboarding/profilesOnboardingSync';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types_db';

/** Temporary: trace hub meta overwrite. Remove after diagnosis. */
function hubClientSidebarDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_SCHOLARSHIPS_HUB_SIDEBAR_DEBUG === '1'
  );
}

const EMPTY_SIDEBAR_COUNTS: ScholarshipSidebarCounts = {
  bestRecommendation: 0,
  recommended: 0,
  easyApply: 0,
  hotDeadlines: 0,
  internationalFriendly: 0,
  matches: 0,
  saved: 0,
  started: 0,
  submitted: 0,
  ignored: 0
};

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

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

function withUrlAudience(
  filters: MoreFiltersState,
  audience: ScholarshipAudienceParam
): MoreFiltersState {
  if (filters.citizenshipAudience === audience) return filters;
  const next = cloneMoreFilters(filters);
  next.citizenshipAudience = audience;
  return next;
}

function ScholarshipsPageInner({
  isAuthenticated,
  authResolved = true,
  hasSubscription = false,
  initialPayload = null,
  routeScope = null,
  leadContent = null,
  postListingContent = null
}: {
  isAuthenticated: boolean;
  /** False until Supabase session is known — avoids guest URL normalization racing ahead of login. */
  authResolved?: boolean;
  hasSubscription?: boolean;
  initialPayload?: InitialScholarshipsPayload | null;
  routeScope?: LongTailRouteScopePayload | null;
  leadContent?: ReactNode;
  postListingContent?: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pathname, setPathname] = useState('/scholarships');
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPathname(window.location.pathname || '/scholarships');
  }, []);

  /**
   * Until Supabase `getSession()` finishes, `isAuthenticated` is false even for signed-in users.
   * Do not show guest padlocks / guest empty states in that window.
   */
  const hubTreatAsGuest = !isAuthenticated && Boolean(authResolved);
  /** Guest parity limits for anyone without a subscription (includes guests). */
  const catalogFreeTier = authResolved && !hasSubscription;
  /** Best tab: avoid one frame of guest UI before we know the session (prevents card ↔ locks flicker). */
  const bestTabAuthPending =
    activeTab === 'best-recommendation' && !authResolved;

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
  const [registrationWallContent, setRegistrationWallContent] =
    useState<ScholarshipRegistrationWallContentMode>('hub');
  const [bestRecommendationWizardStore, setBestRecommendationWizardStore] =
    useState<BestRecommendationWizardStore | null>(null);
  const [bestRecommendationWizardHydrated, setBestRecommendationWizardHydrated] =
    useState(false);
  const [bestRecommendationWizardSaving, setBestRecommendationWizardSaving] =
    useState(false);
  const {
    profile: currentMatchProfile,
    profileInitialized,
    resolved: profileInitResolved
  } =
    useCurrentUserScholarshipMatchProfile(isAuthenticated && authResolved);
  /** Merge server-backed saves (Telegram, heart on site) with localStorage for guests→login edge cases. */
  const refreshSavedIdsFromApi = useCallback(async () => {
    const fromStorage = getSavedScholarshipIds();
    if (!isAuthenticated) {
      setSavedIds(fromStorage);
      return;
    }
    try {
      const serverIds = await fetchUserSavedScholarshipIds();
      if (serverIds !== null) {
        setSavedIds([...new Set([...serverIds, ...fromStorage])]);
        return;
      }
    } catch {
      /* offline */
    }
    setSavedIds(fromStorage);
  }, [isAuthenticated]);

  const syncUserCollectionIdsFromStorage = useCallback(() => {
    if (!isAuthenticated) return;
    setIgnoredIds(getIgnoredScholarshipIds());
    setStartedIds(getStartedScholarshipIds());
    setSubmittedIds(getSubmittedScholarshipIds());
    void refreshSavedIdsFromApi();
  }, [isAuthenticated, refreshSavedIdsFromApi]);

  const openRegistrationWall = useCallback(
    (mode?: ScholarshipRegistrationWallContentMode) => {
      if (activeTab === 'best-recommendation') {
        bridgeBestRecommendationWizardToOnboardingDraft(
          bestRecommendationWizardStore
        );
      }
      setRegistrationWallContent(mode ?? 'hub');
      setRegistrationWallOpen(true);
    },
    [activeTab, bestRecommendationWizardStore]
  );

  const closeRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(false);
  }, []);

  const persistBestRecommendationWizardStore = useCallback(
    (next: BestRecommendationWizardStore) => {
      setBestRecommendationWizardStore(next);
      saveBestRecommendationWizardDraft(next);
    },
    []
  );

  const handleBestRecommendationWizardCreateAccount = useCallback(() => {
    bridgeBestRecommendationWizardToOnboardingDraft(bestRecommendationWizardStore);
    router.push('/onboarding');
  }, [bestRecommendationWizardStore, router]);

  const persistBestRecommendationWizardProfileStep = useCallback(
    async (next: BestRecommendationWizardStore) => {
      if (!isAuthenticated) return;
      setBestRecommendationWizardSaving(true);
      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: currentProfile } = await supabase
          .from('profiles')
          .select(
            'first_name,last_name,birth_month,birth_day,birth_year,date_of_birth,school_level,field_of_study,citizenship_status,gpa,saved_filters_snapshot,state_region'
          )
          .eq('id', user.id)
          .maybeSingle();

        const currentProfileRow = (currentProfile ?? null) as ProfilesRow | null;

        const patch = buildScholarshipProfileFormPatch(
          currentProfileRow,
          {
            firstName: currentProfileRow?.first_name ?? '',
            lastName: currentProfileRow?.last_name ?? '',
            birthMonth:
              currentProfileRow?.birth_month != null
                ? String(currentProfileRow.birth_month)
                : '',
            birthDay:
              currentProfileRow?.birth_day != null
                ? String(currentProfileRow.birth_day)
                : '',
            birthYear:
              currentProfileRow?.birth_year != null
                ? String(currentProfileRow.birth_year)
                : '',
            schoolLevel: next.draft.step1.schoolLevel,
            fieldOfStudy: next.draft.step1.fieldOfStudy,
            citizenshipStatus: next.draft.step1.citizenship,
            gpaChoice: next.draft.step3.gpa,
            stateRegionInput: next.draft.step4.state
          }
        );

        const payload = pickAllowedProfilesUpsertFields({
          id: user.id,
          updated_at: new Date().toISOString(),
          ...patch
        }) as Database['public']['Tables']['profiles']['Insert'];

        await supabase
          .schema('public')
          .from('profiles')
          .upsert(payload, { onConflict: 'id' });
      } finally {
        setBestRecommendationWizardSaving(false);
      }
    },
    [isAuthenticated]
  );

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

  const handleGuestBestRecommendationEditAnswers = useCallback(() => {
    if (!catalogFreeTier || activeTab !== 'best-recommendation') return;
    try {
      sessionStorage.setItem(SCHOLARSHIP_HUB_SKIP_AUTO_LANDING_SEED_ONCE_KEY, '1');
    } catch {
      /* ignore */
    }
    setLandingQuizProfileSeed(null);

    if (
      bestRecommendationWizardStore &&
      bestRecommendationWizardHasUsableData(bestRecommendationWizardStore)
    ) {
      persistBestRecommendationWizardStore({
        ...bestRecommendationWizardStore,
        submitted: false,
        draft: {
          ...bestRecommendationWizardStore.draft,
          activeStep: 1
        }
      });
    } else {
      const landingDraft = loadGuestLandingQuizDraftForHubReEdit();
      if (landingDraft) {
        persistBestRecommendationWizardStore({
          v: 1,
          mode: 'guest',
          submitted: false,
          draft: {
            ...landingDraft,
            activeStep: 1
          }
        });
      } else {
        persistBestRecommendationWizardStore(
          emptyBestRecommendationWizardDraft('guest')
        );
      }
    }

    replaceListingParams({ resetPage: true });
  }, [
    activeTab,
    bestRecommendationWizardStore,
    catalogFreeTier,
    persistBestRecommendationWizardStore,
    replaceListingParams
  ]);

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
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [moreFiltersApplied, setMoreFiltersApplied] =
    useState<MoreFiltersState | null>(() => {
      const meta = initialPayload?.result.meta;
      if (!meta?.filterBounds) return null;
      const pl = parseScholarshipListUrl(new URLSearchParams(searchParamsString));
      const tab = parseHubScholarshipTabParam(pl.tab);
      return withUrlAudience(
        buildHubTabPresetMoreFilters({
          tab,
          filterBounds: meta.filterBounds,
          deadlineFromUrl: pl.deadline,
          routeScope,
          profileFilterSeed: meta.profileFilterSeed,
          landingQuizProfileSeed: null,
          savedFiltersFromStorage:
            isAuthenticated
              ? meta.savedFiltersSnapshotJson
                ? moreFiltersFromJson(meta.savedFiltersSnapshotJson, meta.filterBounds)
                : null
              : typeof window !== 'undefined'
              ? readSavedFiltersFromStorage(meta.filterBounds)
              : null,
          isAuthenticated
        }),
        pl.audience
      );
    });
  const [moreFiltersDraft, setMoreFiltersDraft] =
    useState<MoreFiltersState | null>(null);
  /** `/get-scholarships` quiz: merged into API body only for best/recommended (guest); not into Matches. */
  const [landingQuizProfileSeed, setLandingQuizProfileSeed] =
    useState<ScholarshipProfileFilterSeed | null>(null);
  const bestRecommendationWizardSeed = useMemo(
    () => buildBestRecommendationWizardSeed(bestRecommendationWizardStore),
    [bestRecommendationWizardStore]
  );
  const transientBestRecommendationProfileSeed = useMemo(
    () => bestRecommendationWizardSeed ?? landingQuizProfileSeed ?? null,
    [bestRecommendationWizardSeed, landingQuizProfileSeed]
  );
  const guestBestRecommendationPreviewEnabled =
    catalogFreeTier &&
    activeTab === 'best-recommendation' &&
    transientBestRecommendationProfileSeed != null;
  const bestRecommendationWizardInProgress =
    bestRecommendationWizardStore != null &&
    bestRecommendationWizardStore.submitted === false;
  const shouldPromptScholarshipQuiz =
    authResolved &&
    (hubTreatAsGuest ||
      (isAuthenticated && profileInitResolved && !profileInitialized));
  const appliedProviderSlug =
    routeScope?.providerSlug ?? moreFiltersApplied?.filterUniversitySlug ?? null;
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
    if (raw !== LEGACY_BEST_RECOMMENDATION_TAB_ID) return;
    replaceListingParams({
      tab: 'best-recommendation',
      scope: 'catalog',
      resetPage: false
    });
  }, [searchParams, replaceListingParams]);

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
   * International-friendly audience is a dedicated Matches scope in the hub URL model.
   * Normalize deep links like `tab=best-recommendation&aud=international_friendly`.
   */
  useEffect(() => {
    if (parsedList.audience !== 'international_friendly') return;
    if (activeTab === 'matches') return;
    replaceListingParams({
      tab: 'matches',
      scope: 'catalog',
      sort: 'magic',
      resetPage: true
    });
  }, [activeTab, parsedList.audience, replaceListingParams]);

  /**
   * Guests: one-shot URL normalization (avoids races between multiple effects).
   * — default hub tab + catalog scope when `tab` is missing
   * — strip only unsupported guest params from the URL
   *
   * `recommended` (Saved Filters) is allowed: sidebar links there and the hub shows the guest
   * empty state / signup prompts. Do not rewrite it back to `matches` or clicks appear “broken”.
   */
  useEffect(() => {
    if (isAuthenticated) return;
    if (!authResolved) return;
    const sp = new URLSearchParams(searchParamsString);
    const tab = sp.get('tab');
    /** Personal tabs (saved/ignored) stay in the URL for deep links (e.g. Telegram → hub). */
    const badTab = tab === 'hot-deadlines';
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
  }, [isAuthenticated, authResolved, searchParamsString, replaceListingParams]);

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
        storageKeyMatchesBase(e.key, SAVED_SCHOLARSHIPS_KEY) ||
        storageKeyMatchesBase(e.key, IGNORED_SCHOLARSHIPS_KEY) ||
        storageKeyMatchesBase(e.key, STARTED_SCHOLARSHIPS_KEY) ||
        storageKeyMatchesBase(e.key, SUBMITTED_SCHOLARSHIPS_KEY) ||
        e.key === null
      ) {
        syncUserCollectionIdsFromStorage();
      }
      if (e.key === BEST_RECOMMENDATION_WIZARD_DRAFT_KEY || e.key === null) {
        setBestRecommendationWizardStore(loadBestRecommendationWizardDraft());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [syncUserCollectionIdsFromStorage]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        setViewedIds(getViewedScholarshipIds());
        if (isAuthenticated) void refreshSavedIdsFromApi();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [isAuthenticated, refreshSavedIdsFromApi]);

  const filterBounds = listMeta?.filterBounds ?? {
    amountMin: 0,
    amountMax: 50000,
    applicantsMin: 0,
    applicantsMax: 200000
  };

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    setBestRecommendationWizardStore(loadBestRecommendationWizardDraft());
    setBestRecommendationWizardHydrated(true);
  }, []);

  const landingQuizHubSeedAppliedRef = useRef(false);

  /**
   * `/get-scholarships` finish: one-shot `LANDING_QUIZ_HUB_SEED_KEY`, or after refresh rebuild from
   * `PENDING_ONBOARDING_FROM_LANDING_SESSION_KEY` (kept until `/onboarding` merge).
   * `useLayoutEffect` runs before paint so we do not flash guest “Found 0 + locks” before the seed applies.
   */
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (landingQuizHubSeedAppliedRef.current) return;
    try {
      if (
        sessionStorage.getItem(SCHOLARSHIP_HUB_SKIP_AUTO_LANDING_SEED_ONCE_KEY) ===
        '1'
      ) {
        sessionStorage.removeItem(SCHOLARSHIP_HUB_SKIP_AUTO_LANDING_SEED_ONCE_KEY);
        landingQuizHubSeedAppliedRef.current = true;
        return;
      }
    } catch {
      /* ignore */
    }

    let seed: ScholarshipProfileFilterSeed | null = null;
    const rawOneShot = sessionStorage.getItem(LANDING_QUIZ_HUB_SEED_KEY);
    if (rawOneShot) {
      try {
        seed = JSON.parse(rawOneShot) as ScholarshipProfileFilterSeed;
      } catch {
        /* ignore */
      }
      sessionStorage.removeItem(LANDING_QUIZ_HUB_SEED_KEY);
    }
    if (!seed) {
      seed = tryBuildProfileSeedFromPendingLandingSession();
    }
    if (!seed) {
      seed = tryBuildProfileSeedFromCompletedLandingQuiz();
    }
    if (!seed) return;

    landingQuizHubSeedAppliedRef.current = true;
    setLandingQuizProfileSeed(seed);
    replaceListingParams({ resetPage: true });
  }, [replaceListingParams]);

  const [savedFiltersRevision, setSavedFiltersRevision] = useState(0);
  const serverSavedFiltersForHub = useMemo(() => {
    if (!isAuthenticated) return null;
    if (!listMeta?.savedFiltersSnapshotJson) return null;
    return moreFiltersFromJson(listMeta.savedFiltersSnapshotJson, filterBounds);
  }, [isAuthenticated, listMeta?.savedFiltersSnapshotJson, filterBounds]);
  const savedFiltersForHub = useMemo(() => {
    if (isAuthenticated) return serverSavedFiltersForHub;
    return readSavedFiltersFromStorage(filterBounds);
  }, [filterBounds, isAuthenticated, savedFiltersRevision, serverSavedFiltersForHub]);

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

  /** Hub UI + URL filters only (no landing-quiz merge). Drives Matches + sidebar “Matches” counts. */
  const hubMergedBaseMoreFilters = useMemo(() => {
    return routeBaseMoreFilters && moreFiltersApplied
      ? mergeMoreFilterStates(routeBaseMoreFilters, moreFiltersApplied)
      : (moreFiltersApplied ??
          routeBaseMoreFilters ??
          defaultMoreFiltersFromBounds(filterBounds));
  }, [routeBaseMoreFilters, moreFiltersApplied, filterBounds]);

  /**
   * Best recommendation gets profile-derived hard filters; Recommended keeps the wide catalog
   * and strips profile dimensions so saved preset logic remains the only narrowing source.
   */
  const hubListingBodyMoreFilters = useMemo(() => {
    const merged = hubMergedBaseMoreFilters;
    if (activeTab === 'best-recommendation') {
      return mergeBestRecommendationFiltersFromProfile(
        'best-recommendation',
        cloneMoreFilters(merged),
        listMeta?.profileFilterSeed ?? transientBestRecommendationProfileSeed,
        filterBounds
      );
    }
    if (activeTab === 'recommended') {
      return stripHubProfileHardMatchMoreFilters(cloneMoreFilters(merged));
    }
    return merged;
  }, [
    hubMergedBaseMoreFilters,
    activeTab,
    listMeta?.profileFilterSeed,
    transientBestRecommendationProfileSeed,
    filterBounds
  ]);

  /**
   * `meta_only` sidebar counts must match list POST filters.
   * Easy apply / hot deadlines: keep hub-merged base only so “Matches” is not narrowed by tab scope.
   */
  const hubMetaSidebarMoreFilters = useMemo(() => {
    if (activeTab === 'best-recommendation' && guestBestRecommendationPreviewEnabled) {
      return stripHubProfileHardMatchMoreFilters(
        cloneMoreFilters(hubMergedBaseMoreFilters)
      );
    }
    if (
      activeTab === 'easy-apply' ||
      activeTab === 'hot-deadlines' ||
      (activeTab === 'best-recommendation' && guestBestRecommendationPreviewEnabled)
    ) {
      return hubMergedBaseMoreFilters;
    }
    return withTabEnforcedMoreFilters(hubListingBodyMoreFilters, activeTab);
  }, [
    activeTab,
    guestBestRecommendationPreviewEnabled,
    hubMergedBaseMoreFilters,
    hubListingBodyMoreFilters
  ]);

  useEffect(() => {
    if (isAuthenticated && listMeta?.profileFilterSeed) {
      setLandingQuizProfileSeed(null);
    }
  }, [isAuthenticated, listMeta?.profileFilterSeed]);

  useEffect(() => {
    if (!bestRecommendationWizardHydrated) return;
    if (activeTab !== 'best-recommendation') return;
    if (!isAuthenticated || !authResolved) return;
    if (!profileInitResolved || profileInitialized) return;
    if (bestRecommendationWizardStore) return;
    if (currentMatchProfile) return;
    if (listMeta?.personalizedMatchReady !== false) return;

    const emptyStore = emptyBestRecommendationWizardDraft('signed-in');
    persistBestRecommendationWizardStore(emptyStore);
  }, [
    activeTab,
    authResolved,
    bestRecommendationWizardHydrated,
    bestRecommendationWizardStore,
    currentMatchProfile,
    isAuthenticated,
    profileInitialized,
    profileInitResolved,
    listMeta?.personalizedMatchReady,
    persistBestRecommendationWizardStore
  ]);

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

  /** Built-in preset for the active tab (profile / saved preset / catalog); used for reset + “active” counts. */
  const hubTabCanonicalPreset = useMemo(() => {
    if (!listMeta?.filterBounds) return null;
    return buildHubTabPresetMoreFilters({
      tab: activeTab,
      filterBounds: listMeta.filterBounds,
      deadlineFromUrl: parsedList.deadline,
      routeScope,
      profileFilterSeed: listMeta.profileFilterSeed,
      landingQuizProfileSeed: transientBestRecommendationProfileSeed,
      savedFiltersFromStorage: savedFiltersForHub,
      isAuthenticated
    });
  }, [
    activeTab,
    listMeta?.filterBounds,
    listMeta?.profileFilterSeed,
    parsedList.deadline,
    routeScope,
    transientBestRecommendationProfileSeed,
    savedFiltersForHub,
    isAuthenticated
  ]);

  const moreFiltersBaseline = hubTabCanonicalPreset;

  const presetSyncStateRef = useRef<{
    tab: ScholarshipListTabId;
    profileSig: string;
    landingSig: string;
    savedRev: number;
  } | null>(null);

  useEffect(() => {
    if (!listMeta?.filterBounds) return;
    const profileSig = listMeta.profileFilterSeed
      ? JSON.stringify(listMeta.profileFilterSeed)
      : '';
    const landingSig = transientBestRecommendationProfileSeed
      ? JSON.stringify(transientBestRecommendationProfileSeed)
      : '';
    const prev = presetSyncStateRef.current;

    let shouldReset = false;
    if (!prev) {
      shouldReset = true;
    } else if (prev.tab !== activeTab) {
      shouldReset = true;
      setMoreFiltersDraft(null);
      setMoreFiltersOpen(false);
    } else if (
      activeTab === 'best-recommendation' &&
      (prev.profileSig !== profileSig || prev.landingSig !== landingSig)
    ) {
      shouldReset = true;
    } else if (
      activeTab === 'recommended' &&
      prev.savedRev !== savedFiltersRevision
    ) {
      shouldReset = true;
    }

    if (shouldReset) {
      setMoreFiltersApplied(
        withUrlAudience(
          buildHubTabPresetMoreFilters({
            tab: activeTab,
            filterBounds: listMeta.filterBounds,
            deadlineFromUrl: parsedList.deadline,
            routeScope,
            profileFilterSeed: listMeta.profileFilterSeed,
            landingQuizProfileSeed: transientBestRecommendationProfileSeed,
            savedFiltersFromStorage: savedFiltersForHub,
            isAuthenticated
          }),
          parsedList.audience
        )
      );
    }
    presetSyncStateRef.current = {
      tab: activeTab,
      profileSig,
      landingSig,
      savedRev: savedFiltersRevision
    };
  }, [
    activeTab,
    listMeta?.filterBounds,
    listMeta?.profileFilterSeed,
    transientBestRecommendationProfileSeed,
    savedFiltersForHub,
    savedFiltersRevision,
    routeScope,
    isAuthenticated,
    parsedList.deadline,
    parsedList.audience
  ]);

  /** Keep URL-owned pieces (deadline + audience) aligned without resetting the whole preset. */
  useEffect(() => {
    const dl = parsedList.deadline;
    const target =
      dl != null && dl !== 'any' ? dl : ('any' as const);
    const audienceTarget = parsedList.audience;
    setMoreFiltersApplied((prev) => {
      if (!prev) return prev;
      if (
        prev.deadlinePreset === target &&
        prev.citizenshipAudience === audienceTarget
      ) {
        return prev;
      }
      const next = cloneMoreFilters(prev);
      next.deadlinePreset = target;
      next.citizenshipAudience = audienceTarget;
      return next;
    });
  }, [parsedList.deadline, parsedList.audience]);

  const emptyMoreFiltersState = useMemo(
    () =>
      cloneMoreFilters(
        hubTabCanonicalPreset ?? defaultMoreFiltersFromBounds(filterBounds)
      ),
    [hubTabCanonicalPreset, filterBounds]
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
    if (!hasSubscription) {
      openRegistrationWall();
      return;
    }
    if (!moreFiltersDraft || !saveFilterEnabled) return;
    const merged =
      routeBaseMoreFilters != null
        ? mergeMoreFilterStates(routeBaseMoreFilters, moreFiltersDraft)
        : cloneMoreFilters(moreFiltersDraft);
    const mergedJson = moreFiltersToJson(merged);
    setListMeta((prev) =>
      prev
        ? {
            ...prev,
            savedFiltersSnapshotJson: mergedJson
          }
        : prev
    );
    void fetch('/api/account/saved-filters-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot: mergedJson })
    }).catch(() => {});
    setSavedFiltersRevision((n) => n + 1);
    setMoreFiltersApplied(cloneMoreFilters(merged));
    replaceListingParams({
      tab: 'recommended',
      deadline: merged.deadlinePreset,
      audience: merged.citizenshipAudience,
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
    hasSubscription,
    moreFiltersDraft,
    saveFilterEnabled,
    routeBaseMoreFilters,
    openRegistrationWall,
    replaceListingParams,
    previewCount,
    lastKnownPreviewCount
  ]);

  const sidebarCounts = useMemo((): ScholarshipSidebarCounts => {
    const raw = listMeta?.sidebarCounts ?? EMPTY_SIDEBAR_COUNTS;
    /**
     * Guests: never show signed-in sidebar totals from stale SSR/ISR or a failed
     * `meta_only` refetch (must match POST `/api/scholarships` + `applyListingMetaGuestPatches`).
     * Guest patches force saved/ignored/started/submitted to 0 — use local collection state for those.
     */
    if (!isAuthenticated && authResolved) {
      if (!listMeta) return EMPTY_SIDEBAR_COUNTS;
      const patched: ScholarshipListMeta = {
        ...listMeta,
        sidebarCounts: { ...raw }
      };
      applyListingMetaGuestPatches(patched, {
        authUser: false,
        keepBestRecommendationCount: guestBestRecommendationPreviewEnabled
      });
      if (activeTab === 'best-recommendation' && guestBestRecommendationPreviewEnabled) {
        patched.sidebarCounts.bestRecommendation = totalCount;
      }
      return {
        ...patched.sidebarCounts,
        saved: savedIds.length,
        ignored: ignoredIds.length,
        started: startedIds.length,
        submitted: submittedIds.length
      };
    }
    if (activeTab === 'best-recommendation' && guestBestRecommendationPreviewEnabled) {
      return {
        ...raw,
        bestRecommendation: totalCount
      };
    }
    return raw;
  }, [
    activeTab,
    totalCount,
    listMeta,
    isAuthenticated,
    authResolved,
    guestBestRecommendationPreviewEnabled,
    savedIds,
    ignoredIds,
    startedIds,
    submittedIds
  ]);

  const categoryCounts = useMemo(() => {
    if (listMeta?.categoryCounts) return listMeta.categoryCounts;
    const z = {} as Record<ScholarshipCategoryId, number>;
    for (const id of SCHOLARSHIP_CATEGORY_ORDER) z[id] = 0;
    return z;
  }, [listMeta?.categoryCounts]);
  const scholarshipsForCards = useMemo(
    () => applyProfileMatchPercentToScholarships(scholarships, currentMatchProfile),
    [scholarships, currentMatchProfile]
  );

  /** Invalidates list fetch when landing quiz, tab, auth, or server profile seed changes. */
  const listingRequestFingerprint = useMemo(
    () =>
      JSON.stringify({
        applied: moreFiltersApplied
          ? moreFiltersToJson(moreFiltersApplied)
          : null,
        landingQuiz: transientBestRecommendationProfileSeed,
        tab: activeTab,
        auth: isAuthenticated,
        serverProfileSeed: listMeta?.profileFilterSeed ?? null
      }),
    [
      moreFiltersApplied,
      transientBestRecommendationProfileSeed,
      activeTab,
      isAuthenticated,
      listMeta?.profileFilterSeed
    ]
  );

  /** Sidebar meta: same filter basis as `hubMetaSidebarMoreFilters` / list alignment rules. */
  const sidebarCountsMetaFingerprint = useMemo(
    () => JSON.stringify(moreFiltersToJson(hubMetaSidebarMoreFilters)),
    [hubMetaSidebarMoreFilters]
  );
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
  const sidebarMetaRequestKey = useMemo(
    () =>
      `${activeTab}|${catalogListScope}|${searchParamsString}|${sidebarCountsMetaFingerprint}|${userCollectionsFingerprint}|sf:${savedFiltersSnapshotJson ?? 'none'}|gb:${guestBestRecommendationPreviewEnabled ? 1 : 0}|au:${isAuthenticated ? 1 : 0}|ar:${authResolved ? 1 : 0}`,
    [
      activeTab,
      catalogListScope,
      searchParamsString,
      sidebarCountsMetaFingerprint,
      userCollectionsFingerprint,
      savedFiltersSnapshotJson,
      guestBestRecommendationPreviewEnabled,
      isAuthenticated,
      authResolved
    ]
  );
  const sidebarMetaRequestKeyRef = useRef(sidebarMetaRequestKey);
  sidebarMetaRequestKeyRef.current = sidebarMetaRequestKey;
  /**
   * Show sidebar counts whenever we have meta — not only when `metaKeySynced` matches
   * `sidebarMetaRequestKey`. After a tab change, the preset-sync effect updates
   * `moreFiltersApplied`, which bumps `sidebarCountsMetaFingerprint` and thus
   * `sidebarMetaRequestKey` *after* the meta-only fetch already synced the previous key,
   * leaving the strict equality false forever on tabs like Matches.
   */
  const sidebarCountsReady =
    authResolved && listMeta != null && Boolean(listMeta.sidebarCounts);

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / SCHOLARSHIPS_PAGE_SIZE)
  );
  const rawPageParam = new URLSearchParams(searchParamsString).get('page');
  const pageFromUrl = Math.max(1, Number.parseInt(rawPageParam ?? '1', 10));
  const currentPage = clampScholarshipListPage(rawPageParam, totalPages);
  /** Guests on Best recommendation only load page 1; URL may still carry `page` until normalized. */
  const hubListingPage =
    catalogFreeTier && activeTab === 'best-recommendation' ? 1 : pageFromUrl;
  const listPageForUi =
    catalogFreeTier && activeTab === 'best-recommendation' ? 1 : currentPage;

  useEffect(() => {
    let cancelled = false;
    const metaKey = `${activeTab}|${catalogListScope}|${searchParamsString}|${listingRequestFingerprint}|sf:${savedFiltersSnapshotJson ?? 'none'}|gb:${guestBestRecommendationPreviewEnabled ? 1 : 0}`;
    /**
     * Keep visible list stable on membership mutations (save/ignore/restore):
     * collection changes are handled optimistically in local state and should not
     * invalidate this effect. Do not add `sidebarMetaRequestKey` here — it includes
     * collection fingerprints and would refetch the full list on every save (flash).
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
        metaKeySynced.current = sidebarMetaRequestKey;
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
          page: hubListingPage,
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
        const tabAwareMoreFilters = hubListingBodyMoreFilters
          ? withTabEnforcedMoreFilters(hubListingBodyMoreFilters, activeTab)
          : undefined;
        const data = await postScholarshipsList({
          searchParams: sp.toString(),
          moreFilters: tabAwareMoreFilters
            ? moreFiltersToJson(tabAwareMoreFilters)
            : undefined,
          savedFiltersSnapshot: savedFiltersSnapshotJson,
          guestBestRecommendationPreviewEnabled,
          longTailLegacySlugs: routeScope?.longTailLegacySlugs ?? [],
          requiredSeoTags: routeScope?.requiredSeoTags ?? [],
          seoListingFallback: routeScope?.seoListingFallback,
          slugOnlyMoreFilters: routeScope?.slugOnlyMoreFilters,
          providerSlug: appliedProviderSlug
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
            responseMetaBest: nextMeta?.sidebarCounts.bestRecommendation,
            responseMetaRec: nextMeta?.sidebarCounts.recommended,
            responseMetaMatches: nextMeta?.sidebarCounts.matches,
            responseMetaEasyApply: nextMeta?.sidebarCounts.easyApply,
            hadMetaInResponse: Boolean(nextMeta),
            willCallSetListMeta: Boolean(nextMeta),
            prevListMetaBest: prevMeta?.sidebarCounts.bestRecommendation,
            prevListMetaRec: prevMeta?.sidebarCounts.recommended,
            nextListMetaBest: nextMeta?.sidebarCounts.bestRecommendation,
            nextListMetaRec: nextMeta?.sidebarCounts.recommended
          });
        }
        if (
          data.meta &&
          sidebarMetaRequestKeyRef.current === sidebarMetaRequestKey
        ) {
          setListMeta(data.meta);
          metaKeySynced.current = sidebarMetaRequestKey;
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
    authResolved,
    searchParamsString,
    hubListingPage,
    activeTab,
    listingRequestFingerprint,
    catalogListScope,
    routeScope,
    pathname,
    routeBaseMoreFilters,
    hubListingBodyMoreFilters,
    savedFiltersForHub,
    savedFiltersSnapshotJson,
    appliedProviderSlug,
    guestBestRecommendationPreviewEnabled
  ]);

  useEffect(() => {
    let cancelled = false;
    /**
     * Include auth in the key so we refetch after `authResolved` / login transitions.
     * Otherwise SSR guest meta (Best = 0) can stick while the session is already signed in.
     */
    const metaKey = sidebarMetaRequestKey;
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
           * Align with list POST (`hubListingBodyMoreFilters` + tab rules) so Best / Matches
           * sidebar counts match what the user sees (landing quiz on Best). Easy apply /
           * hot deadlines use `hubMergedBaseMoreFilters` only so Matches is not tab-narrowed.
           */
          moreFilters: moreFiltersToJson(hubMetaSidebarMoreFilters),
          savedFiltersSnapshot: savedFiltersSnapshotJson,
          guestBestRecommendationPreviewEnabled,
          longTailLegacySlugs: routeScope?.longTailLegacySlugs ?? [],
          requiredSeoTags: routeScope?.requiredSeoTags ?? [],
          seoListingFallback: routeScope?.seoListingFallback,
          slugOnlyMoreFilters: routeScope?.slugOnlyMoreFilters,
          providerSlug: appliedProviderSlug
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
    sidebarCountsMetaFingerprint,
    userCollectionsFingerprint,
    catalogListScope,
    hubMergedBaseMoreFilters,
    hubMetaSidebarMoreFilters,
    routeScope,
    filterBounds,
    routeBaseMoreFilters,
    savedFiltersSnapshotJson,
    appliedProviderSlug,
    isAuthenticated,
    authResolved,
    sidebarMetaRequestKey,
    guestBestRecommendationPreviewEnabled
  ]);

  useEffect(() => {
    if (isLoading || totalCount === 0) return;
    const requested = Number.parseInt(rawPageParam ?? '1', 10);
    const valid = clampScholarshipListPage(rawPageParam, totalPages);
    if (!Number.isFinite(requested) || requested < 1 || valid !== requested) {
      replaceListingParams({ page: valid, resetPage: false });
    }
  }, [isLoading, totalCount, totalPages, rawPageParam, replaceListingParams]);

  /** Guests on Best recommendation only see page 1; strip `page` from URL if they land with page>1. */
  useEffect(() => {
    if (isAuthenticated) return;
    if (activeTab !== 'best-recommendation') return;
    const n = Math.max(1, Number.parseInt(rawPageParam ?? '1', 10));
    if (n > 1) {
      replaceListingParams({ page: 1, resetPage: false });
    }
  }, [isAuthenticated, activeTab, rawPageParam, replaceListingParams]);

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
        audience: next.citizenshipAudience,
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
        guestBestRecommendationPreviewEnabled,
        longTailLegacySlugs: routeScope?.longTailLegacySlugs ?? [],
        requiredSeoTags: routeScope?.requiredSeoTags ?? [],
        seoListingFallback: routeScope?.seoListingFallback,
        slugOnlyMoreFilters: routeScope?.slugOnlyMoreFilters,
        providerSlug:
          routeScope?.providerSlug ?? moreFiltersDraft?.filterUniversitySlug ?? null
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
    routeBaseMoreFilters,
    guestBestRecommendationPreviewEnabled
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

  const currentListingHref = useMemo(() => {
    return searchParamsString ? `${pathname}?${searchParamsString}` : pathname;
  }, [pathname, searchParamsString]);

  const buildSidebarTabHref = useCallback(
    (id: ScholarshipListTabId) => {
      const p = buildScholarshipListSearchParams(new URLSearchParams(), {
        tab: id,
        scope: 'catalog',
        audience: 'any',
        resetPage: true
      });
      const qs = p.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname]
  );
  const internationalFriendlyHref = useMemo(() => {
    if (!routeScope?.providerSlug) return SCHOLARSHIPS_HUB_INTERNATIONAL_FRIENDLY_HREF;
    const p = buildScholarshipListSearchParams(new URLSearchParams(), {
      tab: 'matches',
      scope: 'catalog',
      audience: 'international_friendly',
      resetPage: true
    });
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, routeScope?.providerSlug]);

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

  const mergedHubCitizenshipSource = useMemo(() => {
    if (!routeBaseMoreFilters && !moreFiltersApplied) return null;
    if (routeBaseMoreFilters && moreFiltersApplied) {
      return mergeMoreFilterStates(routeBaseMoreFilters, moreFiltersApplied);
    }
    return moreFiltersApplied ?? routeBaseMoreFilters ?? null;
  }, [routeBaseMoreFilters, moreFiltersApplied]);

  const internationalSidebarChecked = useMemo(() => {
    const currentAudience =
      mergedHubCitizenshipSource?.citizenshipAudience ?? 'any';
    return currentAudience === 'international_friendly';
  }, [mergedHubCitizenshipSource]);

  const toggleInternationalAudienceSidebar = useCallback(() => {
    const current =
      moreFiltersApplied ?? cloneMoreFilters(emptyMoreFiltersState);
    const merged =
      routeBaseMoreFilters != null
        ? mergeMoreFilterStates(routeBaseMoreFilters, current)
        : cloneMoreFilters(current);
    const next = cloneMoreFilters(current);
    const nowOn = merged.citizenshipAudience === 'international_friendly';
    const nextAudience = nowOn ? 'any' : 'international_friendly';
    next.citizenshipAudience = nextAudience;
    setMoreFiltersApplied(next);
    replaceListingParams({
      tab: 'matches',
      scope: 'catalog',
      sort: 'magic',
      deadline: next.deadlinePreset,
      audience: nextAudience,
      resetPage: true
    });
  }, [
    moreFiltersApplied,
    emptyMoreFiltersState,
    routeBaseMoreFilters,
    replaceListingParams
  ]);

  const hasListingParams =
    parsedList.q.length > 0 ||
    parsedList.categories.size > 0 ||
    parsedList.sort !== 'magic' ||
    (parsedList.deadline != null && parsedList.deadline !== 'any');

  const clearListingFilters = useCallback(() => {
    if (queryDebounceRef.current) {
      clearTimeout(queryDebounceRef.current);
      queryDebounceRef.current = null;
    }
    setQuery('');
    if (listMeta?.filterBounds) {
      setMoreFiltersApplied(
        buildHubTabPresetMoreFilters({
          tab: activeTab,
          filterBounds: listMeta.filterBounds,
          deadlineFromUrl: null,
          routeScope,
          profileFilterSeed: listMeta.profileFilterSeed,
          landingQuizProfileSeed: transientBestRecommendationProfileSeed,
          savedFiltersFromStorage: savedFiltersForHub,
          isAuthenticated
        })
      );
    }
    const isHubRoot = pathname === '/scholarships';
    router.replace(
      isHubRoot ? buildScholarshipTabHref(activeTab) : pathname,
      { scroll: false }
    );
  }, [
    router,
    pathname,
    activeTab,
    listMeta?.filterBounds,
    listMeta?.profileFilterSeed,
    routeScope,
    transientBestRecommendationProfileSeed,
    savedFiltersForHub,
    isAuthenticated
  ]);

  const showProfileWhy = false;

  const listStart = (listPageForUi - 1) * SCHOLARSHIPS_PAGE_SIZE;
  const toggleSave = useCallback(
    async (id: string) => {
      const wasSaved = savedIds.includes(id);
      if (!isAuthenticated) {
        if (activeTab === 'saved' && wasSaved) {
          setScholarships((prev) => prev.filter((s) => s.id !== id));
          setTotalCount((c) => Math.max(0, c - 1));
        }
        setSavedIds(wasSaved ? removeScholarship(id) : saveScholarship(id));
        return;
      }
      const ok = wasSaved
        ? await deleteUserSavedScholarship(id)
        : await postUserSavedScholarship(id);
      if (!ok) {
        toast({
          title: 'Could not update saved scholarships',
          description: 'Check your connection and try again.',
          variant: 'destructive'
        });
        return;
      }
      if (activeTab === 'saved' && wasSaved) {
        setScholarships((prev) => prev.filter((s) => s.id !== id));
        setTotalCount((c) => Math.max(0, c - 1));
      }
      setSavedIds(wasSaved ? removeScholarship(id) : saveScholarship(id));
    },
    [activeTab, isAuthenticated, savedIds]
  );

  const ignoreScholarship = useCallback(
    (id: string) => {
      setIgnoredIds(addIgnoredScholarship(id));
      if (activeTab !== 'ignored') {
        setScholarships((prev) => prev.filter((s) => s.id !== id));
        setTotalCount((c) => Math.max(0, c - 1));
      }
    },
    [activeTab]
  );

  const restoreScholarship = useCallback(
    (id: string) => {
      setIgnoredIds(removeIgnoredScholarship(id));
      if (activeTab === 'ignored') {
        setScholarships((prev) => prev.filter((s) => s.id !== id));
        setTotalCount((c) => Math.max(0, c - 1));
      }
    },
    [activeTab]
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

  const wizardDisplayStore = useMemo(
    () =>
      bestRecommendationWizardStore ??
      emptyBestRecommendationWizardDraft(
        hubTreatAsGuest ? 'guest' : 'signed-in'
      ),
    [bestRecommendationWizardStore, hubTreatAsGuest]
  );

  const shouldShowBestRecommendationWizard =
    activeTab === 'best-recommendation' &&
    bestRecommendationWizardHydrated &&
    !bestTabAuthPending &&
    ((shouldPromptScholarshipQuiz && !guestBestRecommendationPreviewEnabled) ||
      (!hubTreatAsGuest &&
        (bestRecommendationWizardInProgress ||
          (!bestRecommendationWizardStore &&
            isAuthenticated &&
            authResolved &&
            profileInitResolved &&
            !profileInitialized &&
            currentMatchProfile == null &&
            listMeta?.personalizedMatchReady === false))));
  const bestRecommendationWizardPendingHydration =
    activeTab === 'best-recommendation' &&
    !bestTabAuthPending &&
    !bestRecommendationWizardHydrated;

  const emptyMessage = useMemo(() => {
    if (hubTreatAsGuest && activeTab === 'recommended') {
      return 'Create an account to see personalized recommendations.';
    }
    if (hubTreatAsGuest && activeTab === 'best-recommendation') {
      return 'Sign in and complete your profile to see best recommendations tailored to you.';
    }
    switch (activeTab) {
      case 'saved':
        return 'No saved scholarships yet. Tap the heart on a grant to save it here.';
      case 'ignored':
        return 'No ignored scholarships. Use “Not relevant” on a card to hide a grant from your matches.';
      case 'best-recommendation':
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
  }, [activeTab, hubTreatAsGuest, isAuthenticated, savedFiltersForHub]);

  const guestPersonalizedEmpty =
    hubTreatAsGuest && activeTab === 'recommended';

  /**
   * Saved Filters: completion card only when meta explicitly says profile is not ready for personalization.
   * Avoid `!== true` on undefined so we do not flash this card before the first meta response.
   */
  const authRecommendedProfileIncompleteEmpty =
    Boolean(authResolved) &&
    isAuthenticated &&
    activeTab === 'recommended' &&
    totalCount === 0 &&
    !isLoading &&
    listMeta != null &&
    listMeta.personalizedMatchReady === false;

  /**
   * Centered completion / signup card (toolbar with search · filters · categories stays visible above).
   */
  const profileCompletionEmptyOnly = authRecommendedProfileIncompleteEmpty;

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
                  guest: hubTreatAsGuest
                })}
              </h1>
            </div>
          )
        }
        sidebar={
          <ScholarshipsSidebar
            counts={sidebarCounts}
            showCounts={sidebarCountsReady}
            matchesNewIndicator={null}
            guestMode={catalogFreeTier}
            onGuestRestrictedNav={
              catalogFreeTier ? openRegistrationWall : undefined
            }
            subscriptionLocked={false}
            onSubscriptionRestrictedNav={undefined}
            buildTabHref={routeScope?.providerSlug ? buildSidebarTabHref : undefined}
            internationalStudentsFilter={{
              active: internationalSidebarChecked,
              href: internationalFriendlyHref,
              onActivate: toggleInternationalAudienceSidebar,
              showGuestLock: false,
              showSubscriptionLock: false,
              onGuestRestrictedClick: openRegistrationWall,
              onSubscriptionRestrictedClick: openRegistrationWall
            }}
          />
        }
      >
        <>
          {bestTabAuthPending ? (
            <ScholarshipsBrandLoading density="compact" showTopAccentBar />
          ) : (
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
                  guest: hubTreatAsGuest
                })}
                omitHeadlineBlock
                loadingCountText={scholarshipListLoadingText(activeTab)}
                listTab={activeTab}
                categoriesDisabled={!isLoading && totalCount === 0}
                moreFiltersActiveCount={moreFiltersActiveCount}
                isAuthenticated={authResolved && isAuthenticated}
                hasSubscription={hasSubscription}
                onGuestSortBlocked={
                  catalogFreeTier ? openRegistrationWall : undefined
                }
                onSubscriptionSortBlocked={undefined}
                onGuestLockedAction={
                  catalogFreeTier ? openRegistrationWall : undefined
                }
              />

              {bestRecommendationWizardPendingHydration ? (
                <ScholarshipsBrandLoading density="compact" showTopAccentBar />
              ) : shouldShowBestRecommendationWizard ? (
                <BestRecommendationWizard
                  store={wizardDisplayStore}
                  saving={bestRecommendationWizardSaving}
                  onChange={persistBestRecommendationWizardStore}
                  onPersistSignedInStep={
                    isAuthenticated ? persistBestRecommendationWizardProfileStep : undefined
                  }
                  onSubmit={async (next) => {
                    persistBestRecommendationWizardStore(next);
                    replaceListingParams({ resetPage: true });
                  }}
                />
              ) : isLoading ? (
            <ScholarshipsBrandLoading density="compact" showTopAccentBar />
          ) : hasError ? (
            <div className="text-red-600">Failed to load scholarships</div>
          ) : profileCompletionEmptyOnly ? (
            <div className="mt-4 flex w-full flex-col items-center px-2 pb-10 pt-2 sm:mt-6 sm:pb-16 sm:pt-4">
              <div className="w-full max-w-xl rounded-2xl border border-[#FFD9B3] bg-gradient-to-b from-[#FFF8F1] to-white p-6 text-center shadow-sm sm:p-8">
                <h3 className="text-base font-semibold text-[#7A3B00] sm:text-lg">
                  Complete your profile so we can align saved filters with your profile defaults.
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#8C5A2B]">
                  Fill in your academic and eligibility details so saved filters can merge with your profile where helpful.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link
                    href="/account"
                    className="inline-flex items-center justify-center rounded-xl bg-[#FF7A1A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#E6670C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB27D] focus-visible:ring-offset-2"
                  >
                    Complete profile
                  </Link>
                </div>
              </div>
            </div>
          ) : totalCount === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-10 text-center text-slate-600 shadow-sm">
              <p className="text-base font-medium text-zinc-800">
                {emptyMessage}
              </p>
              {guestPersonalizedEmpty ? (
                <p className="mt-5">
                  <Link
                    href="/onboarding"
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
              {shouldPromptScholarshipQuiz && activeTab === 'matches' ? (
                <div className="mb-4 rounded-2xl border border-gray-200/90 bg-gradient-to-br from-gray-50 via-white to-gray-50/80 p-4 text-center shadow-sm ring-1 ring-gray-100 sm:p-5">
                  <p className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
                    Want better scholarship matches?
                  </p>
                  <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem]">
                    Answer 5 quick questions about your background and goals, then
                    we&apos;ll open your Best recommendation list with scholarships
                    tailored to you.
                  </p>
                  <div className="mt-4">
                    <ScholarshipCatalogEntryLink className="inline-flex w-full items-center justify-center rounded-xl bg-black px-6 py-3 text-center text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.35)] transition duration-200 ease-out hover:bg-zinc-900 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.4)] sm:text-base">
                      Answer 5 questions and find scholarships
                    </ScholarshipCatalogEntryLink>
                  </div>
                </div>
              ) : null}
              {shouldPromptScholarshipQuiz &&
              activeTab === 'best-recommendation' &&
              transientBestRecommendationProfileSeed ? (
                <div className="mb-4 rounded-2xl border border-[#FFD9B3] bg-[#FFF8F1] p-4 text-[#7A3B00] shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        Your best recommendations are based on
                        <br />
                        the answers you just added.
                      </p>
                      <p className="mt-1 text-sm text-[#8C5A2B]">
                        Open two scholarship details for free. On the third one, we&apos;ll ask you
                        to create an account.
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[148px]">
                      <button
                        type="button"
                        onClick={handleGuestBestRecommendationEditAnswers}
                        className="inline-flex w-full items-center justify-center rounded-xl border border-[#FFD9B3] bg-white px-4 py-2.5 text-sm font-semibold text-[#7A3B00] shadow-sm transition hover:bg-[#FFF3E8]"
                      >
                        Edit answers
                      </button>
                      <button
                        type="button"
                        onClick={handleBestRecommendationWizardCreateAccount}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-[#FF7A1A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#E6670C]"
                      >
                        Create free account
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="relative z-0 flex flex-col gap-4">
                {scholarshipsForCards.map((s) => (
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
                    showCardActions={scholarshipTabShowsCardActions(activeTab)}
                    subscriptionLocked={false}
                    isAuthenticated={isAuthenticated}
                    hasSubscription={hasSubscription}
                    listingTab={activeTab}
                    onSubscriptionLockedCategoryClick={undefined}
                    onSubscriptionDetailNavigate={undefined}
                    onGuestDetailNavigate={
                      catalogFreeTier
                        ? () => openRegistrationWall('card-unlock')
                        : undefined
                    }
                    returnToHref={currentListingHref}
                  />
                ))}
              </div>
              <ScholarshipsPagination
                currentPage={listPageForUi}
                totalPages={totalPages}
                buildHref={buildPageHref}
                guestPaginationLocked={
                  catalogFreeTier && activeTab === 'best-recommendation'
                }
                onGuestLockedClick={
                  catalogFreeTier && activeTab === 'best-recommendation'
                    ? () => openRegistrationWall()
                    : undefined
                }
              />
            </>
          )}
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
        isAuthenticated={authResolved && isAuthenticated}
        onGuestLockedAction={
          catalogFreeTier ? openRegistrationWall : undefined
        }
        hasSubscription={hasSubscription}
        onSubscriptionLockedAction={undefined}
      />
      <ScholarshipRegistrationWallModal
        open={registrationWallOpen}
        onClose={closeRegistrationWall}
        contentMode={registrationWallContent}
        signedInWithoutSubscription={
          Boolean(isAuthenticated && authResolved && !hasSubscription)
        }
      />
    </section>
  );
}

export default function ScholarshipsHubPageClient({
  isAuthenticated = false,
  authResolved = true,
  hasSubscription = false,
  initialPayload = null,
  routeScope = null,
  leadContent = null,
  postListingContent = null
}: {
  isAuthenticated?: boolean;
  authResolved?: boolean;
  hasSubscription?: boolean;
  initialPayload?: InitialScholarshipsPayload | null;
  routeScope?: LongTailRouteScopePayload | null;
  leadContent?: ReactNode;
  postListingContent?: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <section className="min-h-screen bg-[#F3F7FA] px-4 py-12 sm:px-5 md:py-12 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <ScholarshipsBrandLoading showTopAccentBar />
          </div>
        </section>
      }
    >
      <ScholarshipsPageInner
        isAuthenticated={isAuthenticated}
        authResolved={authResolved}
        hasSubscription={hasSubscription}
        initialPayload={initialPayload}
        routeScope={routeScope}
        leadContent={leadContent}
        postListingContent={postListingContent}
      />
    </Suspense>
  );
}
