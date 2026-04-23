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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { ScholarshipsHubQueryProvider } from '@/components/providers/ScholarshipsHubQueryProvider';
import { ScholarshipsBrandLoading } from '@/components/scholarships/ScholarshipsBrandLoading';
import BestRecommendationWizard from '@/components/scholarships/BestRecommendationWizard';
import ScholarshipCard from '@/components/scholarships/ScholarshipCard';
import ScholarshipCatalogEntryLink from '@/components/scholarships/ScholarshipCatalogEntryLink';
import ScholarshipsListHeader from '@/components/scholarships/ScholarshipsListHeader';
import ScholarshipsMoreFiltersPanel, {
  type ScholarshipsMoreFiltersContextNotice
} from '@/components/scholarships/ScholarshipsMoreFiltersPanel';
import ScholarshipsPagination from '@/components/scholarships/ScholarshipsPagination';
import ScholarshipsSidebar from '@/components/scholarships/ScholarshipsSidebar';
import ScholarshipsTwoColumnLayout from '@/components/scholarships/ScholarshipsTwoColumnLayout';
import ManageSavedFilterPresetModal from '@/components/scholarships/ManageSavedFilterPresetModal';
import SaveFilterPresetModal from '@/components/scholarships/SaveFilterPresetModal';
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
  type SavedFilterPreset,
  readSavedFilterPresetsFromStorage,
  writeSavedFilterPresetsToStorage,
  upsertSavedFilterPresetInStorage,
  SAVED_FILTER_PRESETS_STORAGE_KEY,
  readSavedFilterPresetsAccountMigratedFlag,
  markSavedFilterPresetsAccountMigrated,
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
  postScholarshipsMeta,
  scholarshipRequestErrorMessage,
  type ScholarshipsListResponse
} from './scholarshipListFetch';
import { buildInitialListRequestKey } from './buildInitialListRequestKey';
import { scholarshipHubQueryStringFromURLSearchParams } from './scholarshipHubCanonicalQueryString';
import type {
  InitialScholarshipsPayload,
  LongTailRouteScopePayload
} from './scholarshipListServerPayload';
import {
  moreFiltersFromJson,
  moreFiltersToJson,
  type MoreFiltersJson
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
  stashLandingQuizDraftForOnboardingMerge,
  tryBuildProfileSeedFromCompletedLandingQuiz,
  tryBuildProfileSeedFromPendingLandingSession
} from '@/lib/onboarding/mergeLandingQuizIntoOnboardingDraft';
import { saveCompletedLandingQuizDraft } from '@/lib/onboarding/getScholarshipsLandingDraft';
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
import {
  hubSaveSectionUserLabel,
  hubScopeFromListContext,
  listingNavPatchForHubScope,
  presetHubScopeMatchesListContext
} from '@/lib/scholarships/hubSavedFilterScope';
import { applyProfileMatchPercentToScholarships } from '@/lib/scholarships/profileMatchBadge';
import { storageKeyMatchesBase } from '@/app/scholarships/userScopedStorage';
import { toast } from '@/components/ui/Toasts/use-toast';
import { buildScholarshipProfileFormPatch } from '@/lib/account/scholarshipProfileFormPatch';
import { pickAllowedProfilesUpsertFields } from '@/lib/onboarding/profilesOnboardingSync';
import { notifyQuizCompletionClient } from '@/lib/analytics/notifyQuizCompletionClient';
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

/**
 * Hub SSR (`fetchInitialHubScholarshipsPayload`) does not pass per-user saved/ignored/email_ids into
 * the list request. Using that empty SSR list as `useQuery` initialData still matches
 * `hubListRequestKey` (URL-only), so with `staleTime` the client would not refetch after
 * collection ids hydrate — Saved/Ignored stayed at 0 despite sidebar counts.
 */
const HUB_TABS_SSR_NEVER_SEEDS_ID_LIST: readonly ScholarshipListTabId[] = [
  'saved',
  'ignored',
  'started',
  'submitted',
  'from-email'
];

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

function parseIdCsv(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

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
  /** Business-only, stable order — matches SSR `searchParamsString` and excludes framework keys. */
  const searchParamsString = useMemo(
    () => scholarshipHubQueryStringFromURLSearchParams(searchParams),
    [searchParams]
  );
  const hubListRequestKey = useMemo(
    () =>
      routeScope
        ? `long_tail:${pathname.replace(/^\/scholarships\//, '')}:${searchParamsString}`
        : buildInitialListRequestKey({
            kind: 'hub',
            routeKey: 'hub',
            searchParamsString
          }),
    [routeScope, pathname, searchParamsString]
  );
  const activeTab: ScholarshipListTabId = parseHubScholarshipTabParam(
    searchParams.get('tab')
  );
  /**
   * SSR list for guests on Best has no `guestBestRecommendationPreviewEnabled` and is always empty.
   * Do not use it as `initialListData` / first paint — the client may still apply
   * `LANDING_QUIZ_HUB_SEED_KEY` in `useLayoutEffect` and refetch with preview enabled.
   */
  const skipSsrListForGuestHubBest =
    !routeScope &&
    !isAuthenticated &&
    activeTab === 'best-recommendation';

  const parsedList = useMemo(
    () => parseScholarshipListUrl(new URLSearchParams(searchParamsString)),
    [searchParamsString]
  );
  const fromEmailIds = useMemo(
    () => parseIdCsv(new URLSearchParams(searchParamsString).get('email_ids')),
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

  const isAuthenticatedRef = useRef(isAuthenticated);
  const authResolvedRef = useRef(authResolved);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);
  useEffect(() => {
    authResolvedRef.current = authResolved;
  }, [authResolved]);

  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>(
    skipSsrListForGuestHubBest
      ? []
      : (initialPayload?.result.scholarships ?? [])
  );
  const [totalCount, setTotalCount] = useState(
    skipSsrListForGuestHubBest ? 0 : (initialPayload?.result.total ?? 0)
  );
  const [listMeta, setListMeta] = useState<ScholarshipListMeta | null>(
    initialPayload?.result.meta ?? null
  );
  const [isLoading, setIsLoading] = useState(
    initialPayload == null || skipSsrListForGuestHubBest
  );
  const [hasInitialLoadCompleted, setHasInitialLoadCompleted] = useState(
    Boolean(initialPayload?.result) && !skipSsrListForGuestHubBest
  );
  const [hasError, setHasError] = useState(
    skipSsrListForGuestHubBest
      ? false
      : Boolean(initialPayload?.result.errorMessage)
  );
  const [errorMessage, setErrorMessage] = useState(
    skipSsrListForGuestHubBest
      ? ''
      : (initialPayload?.result.errorMessage ?? '')
  );
  const [query, setQuery] = useState(parsedList.q);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [startedIds, setStartedIds] = useState<string[]>([]);
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const [registrationWallOpen, setRegistrationWallOpen] = useState(false);
  const [registrationWallVariant, setRegistrationWallVariant] = useState<
    'scholarships' | 'essay' | 'locked-category'
  >('scholarships');
  const [registrationWallContent, setRegistrationWallContent] =
    useState<ScholarshipRegistrationWallContentMode>('hub');
  const [bestRecommendationWizardStore, setBestRecommendationWizardStore] =
    useState<BestRecommendationWizardStore | null>(null);
  const [bestRecommendationWizardHydrated, setBestRecommendationWizardHydrated] =
    useState(false);
  const [bestRecommendationWizardSaving, setBestRecommendationWizardSaving] =
    useState(false);
  /**
   * Guest Best preview list total while `tab=best-recommendation`; reused in the sidebar row
   * after navigating to Matches etc. (meta + guest patches otherwise force Best → 0 off-tab).
   */
  const [guestBestPreviewSidebarCount, setGuestBestPreviewSidebarCount] = useState<
    number | null
  >(null);
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
      setRegistrationWallVariant('scholarships');
      setRegistrationWallContent(mode ?? 'hub');
      setRegistrationWallOpen(true);
    },
    [activeTab, bestRecommendationWizardStore]
  );

  const openLockedCategoryWall = useCallback(() => {
    setRegistrationWallVariant('locked-category');
    setRegistrationWallOpen(true);
  }, []);

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
    // Fresh landing quiz answers should win over stale wizard drafts.
    () => landingQuizProfileSeed ?? bestRecommendationWizardSeed ?? null,
    [landingQuizProfileSeed, bestRecommendationWizardSeed]
  );
  /** When true, list POST must send `guestBestRecommendationPreviewEnabled` or the API returns an empty guest list. */
  const guestBestRecommendationPreviewEnabled =
    catalogFreeTier &&
    activeTab === 'best-recommendation' &&
    transientBestRecommendationProfileSeed != null;

  const routeScopeKey = useMemo(
    () =>
      routeScope
        ? JSON.stringify({
            longTailLegacySlugs: routeScope.longTailLegacySlugs,
            requiredSeoTags: routeScope.requiredSeoTags,
            baseMoreFilters: routeScope.baseMoreFilters,
            slugOnlyMoreFilters: routeScope.slugOnlyMoreFilters,
            seoListingFallback: routeScope.seoListingFallback,
            providerSlug: routeScope.providerSlug
          })
        : 'hub',
    [routeScope]
  );

  useEffect(() => {
    if (!catalogFreeTier || transientBestRecommendationProfileSeed == null) {
      setGuestBestPreviewSidebarCount(null);
      return;
    }
    if (activeTab === 'best-recommendation' && guestBestRecommendationPreviewEnabled) {
      setGuestBestPreviewSidebarCount(totalCount);
    }
  }, [
    catalogFreeTier,
    transientBestRecommendationProfileSeed,
    activeTab,
    guestBestRecommendationPreviewEnabled,
    totalCount
  ]);

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
  /**
   * When this equals `sidebarMetaRequestKey`, `listMeta.sidebarCounts` matches the
   * current filter/tab URL state (avoids showing stale all-zero placeholders).
   */
  const [sidebarGlobalMetaAppliedKey, setSidebarGlobalMetaAppliedKey] = useState<
    string | null
  >(null);
  const initialSidebarMetaHydratedRef = useRef(false);
  const listRequestKeyClientLogRef = useRef<string | null>(null);
  const listMetaRef = useRef<ScholarshipListMeta | null>(listMeta);
  listMetaRef.current = listMeta;

  const userListIdsRef = useRef({
    saved: activeTab === 'from-email' ? fromEmailIds : savedIds,
    ignored: ignoredIds,
    started: startedIds,
    submitted: submittedIds
  });
  userListIdsRef.current = {
    saved: activeTab === 'from-email' ? fromEmailIds : savedIds,
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

  /** From email tab works only with explicit ids from digest token landing URL. */
  useEffect(() => {
    if (activeTab !== 'from-email') return;
    if (fromEmailIds.length > 0) return;
    replaceListingParams({
      tab: 'saved',
      scope: 'catalog',
      resetPage: true
    });
  }, [activeTab, fromEmailIds.length, replaceListingParams]);

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
    const needDefaultHubTab = !tab;
    const parsedDeadline = parseDeadlineFromParam(sp.get('deadline'));
    const hasAdvDeadline = parsedDeadline != null && parsedDeadline !== 'any';
    if (!needDefaultHubTab && !hasAdvDeadline) {
      return;
    }
    const resetPage = hasAdvDeadline;
    replaceListingParams({
      ...(needDefaultHubTab ? { tab: 'matches', scope: 'catalog' } : {}),
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
   *
   * Manual check: DevTools → Application → Session Storage — `scholarship_landing_quiz_hub_seed_v1`
   * (removed after read). If preview never enables, ensure `SCHOLARSHIP_HUB_SKIP_AUTO_LANDING_SEED_ONCE_KEY`
   * is not set to "1" (it intentionally skips re-applying the seed once).
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
        // Remove one-shot key only after successful parse.
        sessionStorage.removeItem(LANDING_QUIZ_HUB_SEED_KEY);
      } catch {
        /* ignore */
      }
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
  const [savedFilterPresetsRevision, setSavedFilterPresetsRevision] = useState(0);
  const [savedFilterPresets, setSavedFilterPresets] = useState<SavedFilterPreset[]>([]);
  const [activeSavedFilterPresetId, setActiveSavedFilterPresetId] = useState<string | null>(null);
  const [recommendedAppliedFilters, setRecommendedAppliedFilters] =
    useState<MoreFiltersState | null>(null);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [presetNameDraft, setPresetNameDraft] = useState('My filter');
  const [presetNameError, setPresetNameError] = useState<string | null>(null);
  const [pendingPresetFilters, setPendingPresetFilters] =
    useState<MoreFiltersState | null>(null);
  const [managedPresetId, setManagedPresetId] = useState<string | null>(null);
  const [managePresetNameDraft, setManagePresetNameDraft] = useState('');
  const [managePresetError, setManagePresetError] = useState<string | null>(null);
  const serverSavedFiltersForHub = useMemo(() => {
    if (!isAuthenticated) return null;
    if (!listMeta?.savedFiltersSnapshotJson) return null;
    return moreFiltersFromJson(listMeta.savedFiltersSnapshotJson, filterBounds);
  }, [isAuthenticated, listMeta?.savedFiltersSnapshotJson, filterBounds]);
  const savedFiltersForHub = useMemo(() => {
    if (recommendedAppliedFilters) return recommendedAppliedFilters;
    if (isAuthenticated) return serverSavedFiltersForHub;
    return readSavedFiltersFromStorage(filterBounds);
  }, [
    filterBounds,
    isAuthenticated,
    savedFiltersRevision,
    serverSavedFiltersForHub,
    recommendedAppliedFilters
  ]);

  const presetsForCurrentHubSection = useMemo(
    () =>
      savedFilterPresets.filter((p) =>
        presetHubScopeMatchesListContext(
          p.hubScope,
          activeTab,
          parsedList.audience
        )
      ),
    [savedFilterPresets, activeTab, parsedList.audience]
  );

  const saveFilterSectionLabel = useMemo(
    () => hubSaveSectionUserLabel(activeTab, parsedList.audience),
    [activeTab, parsedList.audience]
  );

  const savedFilterBarHint = useMemo(() => {
    if (presetsForCurrentHubSection.length === 0) return undefined;
    return `Saved in this section · ${saveFilterSectionLabel}`;
  }, [presetsForCurrentHubSection.length, saveFilterSectionLabel]);

  /** Recommended tab: only run list POST when we have filter payload to query (avoids empty DB work). */
  const hasPresets = Boolean(savedFiltersForHub);

  const syncSavedFilterPresetsToAccount = useCallback(
    async (payload: { activePresetId: string | null; presets: SavedFilterPreset[] }) => {
      if (!isAuthenticated || !authResolved) return;
      try {
        await fetch('/api/account/saved-filter-presets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch {
        // ignore: offline / transient errors; local cache still applies
      }
    },
    [isAuthenticated, authResolved]
  );

  const commitSavedFilterPresets = useCallback(
    (
      payload: { activePresetId: string | null; presets: SavedFilterPreset[] },
      options?: { applyActiveToRecommended?: boolean }
    ) => {
      const applyActiveToRecommended = options?.applyActiveToRecommended !== false;
      writeSavedFilterPresetsToStorage(payload);
      setSavedFilterPresets(payload.presets);
      setActiveSavedFilterPresetId(payload.activePresetId);
      if (applyActiveToRecommended) {
        if (payload.activePresetId) {
          const active = payload.presets.find((p) => p.id === payload.activePresetId);
          if (active) {
            setRecommendedAppliedFilters(moreFiltersFromJson(active.snapshot, filterBounds));
          } else {
            setRecommendedAppliedFilters(null);
          }
        } else {
          setRecommendedAppliedFilters(null);
        }
      }
      void syncSavedFilterPresetsToAccount(payload);
    },
    [filterBounds, syncSavedFilterPresetsToAccount]
  );

  useEffect(() => {
    if (!authResolved) return;
    if (isAuthenticated) return;
    const payload = readSavedFilterPresetsFromStorage();
    setSavedFilterPresets(payload.presets);
    setActiveSavedFilterPresetId(payload.activePresetId);
    if (payload.activePresetId) {
      const active = payload.presets.find((p) => p.id === payload.activePresetId);
      if (active) {
        setRecommendedAppliedFilters(moreFiltersFromJson(active.snapshot, filterBounds));
        return;
      }
    }
    setRecommendedAppliedFilters(null);
  }, [authResolved, isAuthenticated, filterBounds, savedFilterPresetsRevision]);

  useEffect(() => {
    if (!authResolved || !isAuthenticated) return;
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch('/api/account/saved-filter-presets', { method: 'GET' });
        if (!res.ok) return;
        const remote = (await res.json()) as {
          activePresetId?: string | null;
          presets?: SavedFilterPreset[];
        };
        if (cancelled) return;

        const remotePresets = Array.isArray(remote.presets) ? remote.presets : [];
        const remoteActive =
          typeof remote.activePresetId === 'string' && remote.activePresetId
            ? remote.activePresetId
            : null;
        const remoteNormalized = {
          presets: remotePresets,
          activePresetId:
            remoteActive && remotePresets.some((p) => p.id === remoteActive) ? remoteActive : null
        };

        const local = readSavedFilterPresetsFromStorage();
        const localHasPresets = local.presets.length > 0;
        const remoteEmpty = remoteNormalized.presets.length === 0;
        const shouldMigrate =
          remoteEmpty &&
          localHasPresets &&
          !readSavedFilterPresetsAccountMigratedFlag();

        let next = remoteNormalized;
        if (shouldMigrate) {
          try {
            const putRes = await fetch('/api/account/saved-filter-presets', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(local)
            });
            if (putRes.ok) {
              markSavedFilterPresetsAccountMigrated();
              next = local;
            }
          } catch {
            // ignore: keep remoteNormalized
          }
        }

        writeSavedFilterPresetsToStorage(next);
        setSavedFilterPresets(next.presets);
        setActiveSavedFilterPresetId(next.activePresetId);
        if (next.activePresetId) {
          const active = next.presets.find((p) => p.id === next.activePresetId);
          if (active) {
            setRecommendedAppliedFilters(moreFiltersFromJson(active.snapshot, filterBounds));
            return;
          }
        }
        setRecommendedAppliedFilters(null);
      } catch {
        if (!cancelled) {
          const payload = readSavedFilterPresetsFromStorage();
          setSavedFilterPresets(payload.presets);
          setActiveSavedFilterPresetId(payload.activePresetId);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [authResolved, isAuthenticated, filterBounds]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVED_FILTERS_STORAGE_KEY || e.key === null) {
        setSavedFiltersRevision((n) => n + 1);
      }
      if (e.key === SAVED_FILTER_PRESETS_STORAGE_KEY || e.key === null) {
        // Signed-in users sync presets from Supabase; avoid re-triggering guest hydration loops.
        if (!isAuthenticatedRef.current || !authResolvedRef.current) {
          setSavedFilterPresetsRevision((n) => n + 1);
        }
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
    filterBounds,
    savedFiltersForHub,
    routeBaseMoreFilters
  ]);

  const listMoreFiltersJson = useMemo((): MoreFiltersJson | null => {
    if (!hubListingBodyMoreFilters) return null;
    try {
      return moreFiltersToJson(
        withTabEnforcedMoreFilters(hubListingBodyMoreFilters, activeTab)
      );
    } catch {
      return null;
    }
  }, [hubListingBodyMoreFilters, activeTab]);

  /**
   * `meta_only` sidebar counts must reflect catalog-wide totals per row (Matches, Hot deadlines, …).
   * Guest Best preview narrows `hubListingBodyMoreFilters` with quiz seed for the main list only;
   * reusing that object for sidebar meta collapses those counts to the preview pool (wrong UX).
   */
  const hubSidebarMetaMoreFilters = useMemo(() => {
    if (!hubListingBodyMoreFilters || !hubMergedBaseMoreFilters) {
      return hubListingBodyMoreFilters;
    }
    if (guestBestRecommendationPreviewEnabled && !isAuthenticated) {
      return stripHubProfileHardMatchMoreFilters(
        cloneMoreFilters(hubMergedBaseMoreFilters)
      );
    }
    return hubListingBodyMoreFilters;
  }, [
    guestBestRecommendationPreviewEnabled,
    isAuthenticated,
    hubListingBodyMoreFilters,
    hubMergedBaseMoreFilters
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
    return countMoreFilterSelections(merged, filterBounds) > 0 || activeTab === 'recommended';
  }, [
    moreFiltersDraft,
    isAuthenticated,
    routeBaseMoreFilters,
    filterBounds,
    activeTab
  ]);

  const saveMoreFiltersPreset = useCallback(() => {
    if (!moreFiltersDraft || !saveFilterEnabled) return;
    const merged =
      routeBaseMoreFilters != null
        ? mergeMoreFilterStates(routeBaseMoreFilters, moreFiltersDraft)
        : cloneMoreFilters(moreFiltersDraft);
    const mergedSelectionCount = countMoreFilterSelections(merged, filterBounds);
    if (mergedSelectionCount <= 0) {
      setRecommendedAppliedFilters(null);
      commitSavedFilterPresets(
        { presets: savedFilterPresets, activePresetId: null },
        { applyActiveToRecommended: false }
      );
      setMoreFiltersOpen(false);
      toast({
        title: 'Add at least one filter',
        description: 'Saved Filters stays at 0 until at least one criterion is selected.'
      });
      return;
    }
    setPendingPresetFilters(cloneMoreFilters(merged));
    setPresetNameError(null);
    setPresetNameDraft('My filter');
    setIsSavePresetModalOpen(true);
  }, [
    moreFiltersDraft,
    saveFilterEnabled,
    routeBaseMoreFilters,
    activeTab,
    filterBounds,
    savedFilterPresets,
    commitSavedFilterPresets
  ]);

  const closeSavePresetModal = useCallback(() => {
    setIsSavePresetModalOpen(false);
    setPresetNameError(null);
    setPendingPresetFilters(null);
  }, []);

  const submitSavePresetModal = useCallback(() => {
    if (!pendingPresetFilters) return;
    const presetName = presetNameDraft.trim();
    if (!presetName) {
      setPresetNameError('Preset name is required.');
      return;
    }
    if (presetName.length > 64) {
      setPresetNameError('Preset name must be 64 characters or fewer.');
      return;
    }
    setPresetNameError(null);
    const mergedJson = moreFiltersToJson(pendingPresetFilters);
    const hubScope = hubScopeFromListContext(activeTab, parsedList.audience);
    const nextPresetsPayload = upsertSavedFilterPresetInStorage(
      presetName,
      pendingPresetFilters,
      hubScope
    );
    commitSavedFilterPresets(nextPresetsPayload, { applyActiveToRecommended: false });
    setRecommendedAppliedFilters(cloneMoreFilters(pendingPresetFilters));
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
    setMoreFiltersApplied(cloneMoreFilters(pendingPresetFilters));
    const nav = listingNavPatchForHubScope(hubScope, pendingPresetFilters);
    replaceListingParams({
      tab: nav.tab,
      deadline: nav.deadline,
      audience: nav.audience,
      scope: nav.scope,
      resetPage: true
    });
    setMoreFiltersOpen(false);
    setIsSavePresetModalOpen(false);
    setPendingPresetFilters(null);

    const approxCount = previewCount ?? lastKnownPreviewCount;
    const countPhrase =
      approxCount != null && Number.isFinite(approxCount)
        ? ` (${approxCount.toLocaleString('en-US')})`
        : '';
    toast({
      title: 'Filter saved',
      description: `Saved as "${presetName}"${countPhrase} for ${saveFilterSectionLabel}. Use the chips next to Filters to switch presets.`
    });
  }, [
    pendingPresetFilters,
    presetNameDraft,
    previewCount,
    lastKnownPreviewCount,
    replaceListingParams,
    commitSavedFilterPresets,
    activeTab,
    parsedList.audience,
    saveFilterSectionLabel
  ]);

  const openManageSavedFilterPreset = useCallback(
    (presetId: string) => {
      const preset = savedFilterPresets.find((p) => p.id === presetId);
      if (!preset) return;
      setManagedPresetId(preset.id);
      setManagePresetNameDraft(preset.name);
      setManagePresetError(null);
    },
    [savedFilterPresets]
  );

  const closeManageSavedFilterPreset = useCallback(() => {
    setManagedPresetId(null);
    setManagePresetNameDraft('');
    setManagePresetError(null);
  }, []);

  const applyManagedSavedFilterPreset = useCallback(() => {
    if (!managedPresetId) return;
    const nextName = managePresetNameDraft.trim();
    if (!nextName) {
      setManagePresetError('Preset name is required.');
      return;
    }
    if (nextName.length > 64) {
      setManagePresetError('Preset name must be 64 characters or fewer.');
      return;
    }
    const nextPresets = savedFilterPresets.map((preset) => {
      if (preset.id !== managedPresetId) return preset;
      if (preset.name === nextName) return preset;
      return {
        ...preset,
        name: nextName,
        updatedAt: new Date().toISOString()
      };
    });
    const targetPreset = nextPresets.find((preset) => preset.id === managedPresetId);
    if (!targetPreset) {
      setManagePresetError('Preset not found.');
      return;
    }
    commitSavedFilterPresets(
      { presets: nextPresets, activePresetId: managedPresetId },
      { applyActiveToRecommended: false }
    );
    setManagePresetError(null);
    const nextState = moreFiltersFromJson(targetPreset.snapshot, filterBounds);
    setRecommendedAppliedFilters(cloneMoreFilters(nextState));
    setMoreFiltersApplied(cloneMoreFilters(nextState));
    const nav = listingNavPatchForHubScope(targetPreset.hubScope, nextState);
    replaceListingParams({
      tab: nav.tab,
      deadline: nav.deadline,
      audience: nav.audience,
      scope: nav.scope,
      resetPage: true
    });
    closeManageSavedFilterPreset();
    toast({
      title: 'Preset applied',
      description:
        targetPreset.name === nextName
          ? `Applied "${nextName}" preset.`
          : `Renamed and applied "${nextName}" preset.`
    });
  }, [
    managedPresetId,
    managePresetNameDraft,
    closeManageSavedFilterPreset,
    filterBounds,
    replaceListingParams,
    savedFilterPresets,
    commitSavedFilterPresets
  ]);

  const deleteManagedSavedFilterPreset = useCallback(() => {
    if (!managedPresetId) return;
    const deletingActive = activeSavedFilterPresetId === managedPresetId;
    const nextPresets = savedFilterPresets.filter((preset) => preset.id !== managedPresetId);
    const nextActiveId = deletingActive ? null : activeSavedFilterPresetId;
    commitSavedFilterPresets(
      { presets: nextPresets, activePresetId: nextActiveId },
      { applyActiveToRecommended: false }
    );
    if (deletingActive) {
      setRecommendedAppliedFilters(null);
      setMoreFiltersApplied(null);
      setListMeta((prev) =>
        prev
          ? {
              ...prev,
              savedFiltersSnapshotJson: null
            }
          : prev
      );
      replaceListingParams({
        tab: 'matches',
        scope: 'catalog',
        deadline: 'any',
        audience: 'any',
        resetPage: true
      });
    }
    closeManageSavedFilterPreset();
    toast({
      title: 'Preset deleted',
      description: 'Saved filter preset removed.'
    });
  }, [
    managedPresetId,
    closeManageSavedFilterPreset,
    replaceListingParams,
    savedFilterPresets,
    activeSavedFilterPresetId,
    commitSavedFilterPresets
  ]);

  /**
   * After switching from Matches → Best (guest preview), `totalCount` still reflects the old
   * tab until the next POST returns — it often equals catalog `matches` (e.g. 8527). Avoid
   * flashing that number in the header and in the Best sidebar row.
   */
  const guestBestPreviewStaleMatchesTotal = useMemo(() => {
    if (!guestBestRecommendationPreviewEnabled || !listMeta?.sidebarCounts) {
      return false;
    }
    const m = listMeta.sidebarCounts.matches;
    return m >= 50 && totalCount === m;
  }, [guestBestRecommendationPreviewEnabled, listMeta?.sidebarCounts, totalCount]);

  /** `null` = hide aggregate in header until the real Best list total arrives. */
  const headerTotalCount = useMemo((): number | null => {
    if (!guestBestPreviewStaleMatchesTotal) return totalCount;
    return guestBestPreviewSidebarCount;
  }, [guestBestPreviewStaleMatchesTotal, guestBestPreviewSidebarCount, totalCount]);

  const sidebarCounts = useMemo((): ScholarshipSidebarCounts => {
    const raw = listMeta?.sidebarCounts ?? EMPTY_SIDEBAR_COUNTS;
    if (activeTab === 'recommended') {
      const recommendedCount =
        savedFiltersForHub == null
          ? 0
          : isLoading
            ? raw.recommended
            : totalCount;
      return {
        ...raw,
        recommended: recommendedCount,
        saved: savedIds.length,
        ignored: ignoredIds.length,
        ...(isAuthenticated && authResolved
          ? {
              started: startedIds.length,
              submitted: submittedIds.length
            }
          : {})
      };
    }
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
        const catalogMatches = patched.sidebarCounts.matches;
        const staleListTotal =
          catalogMatches >= 50 && totalCount === catalogMatches;
        if (staleListTotal && guestBestPreviewSidebarCount != null) {
          patched.sidebarCounts.bestRecommendation = guestBestPreviewSidebarCount;
        } else if (staleListTotal) {
          patched.sidebarCounts.bestRecommendation = 0;
        } else {
          patched.sidebarCounts.bestRecommendation = totalCount;
        }
      } else if (
        catalogFreeTier &&
        transientBestRecommendationProfileSeed != null &&
        guestBestPreviewSidebarCount != null
      ) {
        patched.sidebarCounts.bestRecommendation = guestBestPreviewSidebarCount;
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
      const catalogMatches = raw.matches;
      const staleListTotal = catalogMatches >= 50 && totalCount === catalogMatches;
      const bestRec =
        staleListTotal && guestBestPreviewSidebarCount != null
          ? guestBestPreviewSidebarCount
          : staleListTotal
            ? 0
            : totalCount;
      return {
        ...raw,
        bestRecommendation: bestRec,
        saved: savedIds.length,
        ignored: ignoredIds.length
      };
    }
    return {
      ...raw,
      saved: savedIds.length,
      ignored: ignoredIds.length
    };
  }, [
    activeTab,
    savedFiltersForHub,
    isLoading,
    totalCount,
    listMeta,
    isAuthenticated,
    authResolved,
    guestBestRecommendationPreviewEnabled,
    guestBestPreviewSidebarCount,
    catalogFreeTier,
    transientBestRecommendationProfileSeed,
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
  const scholarshipsForCards = useMemo(() => {
    const base = applyProfileMatchPercentToScholarships(
      scholarships,
      currentMatchProfile
    );
    if (activeTab !== 'from-email' || fromEmailIds.length === 0) {
      return base;
    }
    const emailRank = new Map<string, number>();
    for (let i = 0; i < fromEmailIds.length; i += 1) {
      emailRank.set(fromEmailIds[i]!, i);
    }
    return [...base].sort((a, b) => {
      const ai = emailRank.get(a.id);
      const bi = emailRank.get(b.id);
      if (ai == null && bi == null) return 0;
      if (ai != null && bi == null) return -1;
      if (ai == null && bi != null) return 1;
      return (ai ?? 0) - (bi ?? 0);
    });
  }, [activeTab, fromEmailIds, scholarships, currentMatchProfile]);

  const { viewedSet, savedSet } = useMemo(
    () => ({
      viewedSet: new Set(viewedIds),
      savedSet: new Set(savedIds)
    }),
    [viewedIds, savedIds]
  );

  /**
   * List/cache identity: tab, filter UI, guest quiz, auth. Intentionally omits
   * `listMeta.profileFilterSeed` so the React Query key does not change after
   * hydration when meta loads (tab switching can hit cache).
   */
  const listingRequestFingerprint = useMemo(
    () =>
      JSON.stringify({
        applied: moreFiltersApplied
          ? moreFiltersToJson(moreFiltersApplied)
          : null,
        landingQuiz: transientBestRecommendationProfileSeed,
        tab: activeTab,
        auth: isAuthenticated
      }),
    [
      moreFiltersApplied,
      transientBestRecommendationProfileSeed,
      activeTab,
      isAuthenticated
    ]
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
      [
        'global-sidebar',
        'scope:catalog',
        userCollectionsFingerprint,
        `au:${isAuthenticated ? 1 : 0}`,
        `ar:${authResolved ? 1 : 0}`,
        `sf:${savedFiltersSnapshotJson ?? 'none'}`,
        `ap:${activeSavedFilterPresetId ?? 'none'}`,
        `lfp:${listingRequestFingerprint}`,
        `url:${searchParamsString}`
      ].join('|'),
    [
      userCollectionsFingerprint,
      isAuthenticated,
      authResolved,
      savedFiltersSnapshotJson,
      activeSavedFilterPresetId,
      listingRequestFingerprint,
      searchParamsString
    ]
  );
  const sidebarMetaRequestKeyRef = useRef(sidebarMetaRequestKey);
  sidebarMetaRequestKeyRef.current = sidebarMetaRequestKey;
  useLayoutEffect(() => {
    if (initialSidebarMetaHydratedRef.current) return;
    if (!initialPayload?.result?.meta?.sidebarCounts) return;
    initialSidebarMetaHydratedRef.current = true;
    setSidebarGlobalMetaAppliedKey(sidebarMetaRequestKey);
  }, [initialPayload, sidebarMetaRequestKey]);
  /**
   * Show tab counts only when `sidebarCounts` match the current URL/filter key
   * (hides all-zero flash before `meta_only` or SSR meta lands).
   */
  const sidebarCountsReady =
    authResolved &&
    listMeta != null &&
    Boolean(listMeta.sidebarCounts) &&
    sidebarGlobalMetaAppliedKey === sidebarMetaRequestKey;

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

  const queryClient = useQueryClient();

  const initialListData = useMemo((): ScholarshipsListResponse | undefined => {
    if (skipSsrListForGuestHubBest) return undefined;
    if (!initialPayload?.result) return undefined;
    if (initialPayload.requestKey !== hubListRequestKey) return undefined;
    if (HUB_TABS_SSR_NEVER_SEEDS_ID_LIST.includes(activeTab)) return undefined;
    const r = initialPayload.result;
    return {
      scholarships: r.scholarships,
      total: r.total,
      page: r.page,
      limit: r.limit,
      meta: r.meta,
      errorMessage: r.errorMessage,
      matchPaywall: r.matchPaywall,
      seoFallback: r.seoFallback
    } as ScholarshipsListResponse;
  }, [initialPayload, hubListRequestKey, skipSsrListForGuestHubBest, activeTab]);

  /** Incl. user collections so list refetches when saved/ignored ids hydrate after `refreshSavedIdsFromApi` (sidebar would show counts from state while list stayed a stale 0 from first empty-id POST). */
  const hubListQueryKey = useMemo(
    () =>
      [
        'scholarships',
        'hub',
        'list',
        searchParamsString,
        listMoreFiltersJson,
        routeScopeKey,
        appliedProviderSlug,
        guestBestRecommendationPreviewEnabled ? 1 : 0,
        listingRequestFingerprint,
        userCollectionsFingerprint,
        hubListingPage,
        savedFiltersSnapshotJson,
        catalogListScope,
        pathname
      ] as const,
    [
      searchParamsString,
      listMoreFiltersJson,
      routeScopeKey,
      appliedProviderSlug,
      guestBestRecommendationPreviewEnabled,
      listingRequestFingerprint,
      userCollectionsFingerprint,
      hubListingPage,
      savedFiltersSnapshotJson,
      catalogListScope,
      pathname
    ]
  );

  const listQueryEnabled = activeTab !== 'recommended' || hasPresets;

  const initialMetaData = useMemo(() => {
    if (!initialPayload?.result?.meta) return undefined;
    if (initialPayload.requestKey !== hubListRequestKey) return undefined;
    const r = initialPayload.result;
    return { meta: r.meta, page: r.page, limit: r.limit };
  }, [initialPayload, hubListRequestKey]);

  const hubMetaQueryKey = useMemo(
    () =>
      [
        'scholarships',
        'hub',
        'meta',
        sidebarMetaRequestKey,
        searchParamsString,
        appliedProviderSlug,
        guestBestRecommendationPreviewEnabled ? 1 : 0,
        routeScopeKey
      ] as const,
    [
      sidebarMetaRequestKey,
      searchParamsString,
      appliedProviderSlug,
      guestBestRecommendationPreviewEnabled,
      routeScopeKey
    ]
  );

  if (
    process.env.NODE_ENV === 'development' &&
    listRequestKeyClientLogRef.current !== hubListRequestKey
  ) {
    listRequestKeyClientLogRef.current = hubListRequestKey;
    // eslint-disable-next-line no-console -- dev: should match `initialPayload.requestKey` on hydration
    console.log('CLIENT KEY:', hubListRequestKey);
  }

  const listQuery = useQuery({
    queryKey: hubListQueryKey,
    queryFn: async (): Promise<ScholarshipsListResponse> => {
      const metaKey = `${activeTab}|${catalogListScope}|${searchParamsString}|${listingRequestFingerprint}|sf:${savedFiltersSnapshotJson ?? 'none'}|gb:${guestBestRecommendationPreviewEnabled ? 1 : 0}`;
      const requestCacheKey = metaKey;
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
      return data;
    },
    enabled: listQueryEnabled,
    initialData: initialListData,
    staleTime: 300_000,
    refetchOnMount: false
  });

  const sidebarMetaQuery = useQuery({
    queryKey: hubMetaQueryKey,
    queryFn: () => {
      const ids = userListIdsRef.current;
      const sp = buildHubListingSearchParams({
        base: new URLSearchParams(searchParamsString),
        page: 1,
        tab: 'matches',
        meta: true,
        saved: ids.saved,
        ignored: ids.ignored,
        started: ids.started,
        submitted: ids.submitted,
        scope: 'catalog'
      });
      return postScholarshipsMeta({
        searchParams: sp.toString(),
        moreFilters: hubSidebarMetaMoreFilters
          ? moreFiltersToJson(hubSidebarMetaMoreFilters)
          : undefined,
        savedFiltersSnapshot: savedFiltersSnapshotJson,
        guestBestRecommendationPreviewEnabled,
        longTailLegacySlugs: routeScope?.longTailLegacySlugs ?? [],
        requiredSeoTags: routeScope?.requiredSeoTags ?? [],
        seoListingFallback: routeScope?.seoListingFallback,
        slugOnlyMoreFilters: routeScope?.slugOnlyMoreFilters,
        providerSlug: appliedProviderSlug,
        sidebarOnlyMeta: true
      });
    },
    enabled: authResolved,
    initialData: initialMetaData,
    staleTime: 300_000,
    refetchOnMount: false
  });

  useEffect(() => {
    if (activeTab === 'recommended' && !savedFiltersForHub) {
      setScholarships([]);
      setTotalCount(0);
      setHasError(false);
      setErrorMessage('');
      setIsLoading(false);
      setHasInitialLoadCompleted(true);
      return;
    }
    if (listQuery.isError) {
      // eslint-disable-next-line no-console -- list fetch diagnostics
      console.error(
        '[ScholarshipsHub] postScholarshipsList failed',
        listQuery.error
      );
      setHasError(true);
      setErrorMessage(
        scholarshipRequestErrorMessage(
          listQuery.error,
          'Failed to load scholarships.'
        )
      );
      setIsLoading(false);
      setHasInitialLoadCompleted(true);
      return;
    }
    const d = listQuery.data;
    if (d) {
      setScholarships(d.scholarships);
      setTotalCount(d.total);
      setHasError(Boolean(d.errorMessage));
      setErrorMessage(d.errorMessage ?? '');
    }
    setIsLoading(listQuery.isPending && !d);
    if (listQuery.isFetched || d) {
      setHasInitialLoadCompleted(true);
    }
    if (!d) return;
    const nextMeta = d.meta ?? null;
    if (nextMeta && sidebarMetaRequestKeyRef.current === sidebarMetaRequestKey) {
      setListMeta((prev) => {
        const merged = prev ? { ...prev, ...nextMeta } : nextMeta;
        if (guestBestRecommendationPreviewEnabled) {
          return {
            ...merged,
            sidebarCounts: prev?.sidebarCounts ?? merged.sidebarCounts
          };
        }
        return merged;
      });
      if (!guestBestRecommendationPreviewEnabled) {
        metaKeySynced.current = sidebarMetaRequestKey;
        queryClient.setQueryData(hubMetaQueryKey, {
          meta: nextMeta,
          page: 1,
          limit: d.limit
        });
      }
    }
  }, [
    activeTab,
    savedFiltersForHub,
    listQuery.data,
    listQuery.isError,
    listQuery.isPending,
    listQuery.isFetched,
    listQuery.error,
    sidebarMetaRequestKey,
    guestBestRecommendationPreviewEnabled,
    queryClient,
    hubMetaQueryKey
  ]);

  useEffect(() => {
    const sidebarMeta = sidebarMetaQuery.data?.meta;
    if (!sidebarMeta) return;
    setListMeta((prev) =>
      prev
        ? {
            ...prev,
            sidebarCounts: sidebarMeta.sidebarCounts
          }
        : sidebarMeta
    );
    metaKeySynced.current = sidebarMetaRequestKey;
    setSidebarGlobalMetaAppliedKey(sidebarMetaRequestKey);
  }, [sidebarMetaQuery.data, sidebarMetaRequestKey]);

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

  const moreFiltersPanelContextNotices = useMemo((): ScholarshipsMoreFiltersContextNotice[] => {
    const out: ScholarshipsMoreFiltersContextNotice[] = [];
    if (activeTab === 'easy-apply') {
      out.push({
        key: 'scope-easy-apply',
        title: 'This view',
        body: 'Easy Apply uses our catalog rules for No Essay, Easy Apply, and Quick Apply scholarships. That layer is applied on top of the filters you set below.'
      });
    }
    if (activeTab === 'hot-deadlines') {
      out.push({
        key: 'scope-hot-deadlines',
        title: 'This view',
        body: 'Hot deadlines shows scholarships whose deadline is in about the next seven days (database deadline buckets). The deadline radio buttons below further narrow that list when you choose one.'
      });
    }
    if (activeTab === 'matches' && parsedList.audience === 'international_friendly') {
      out.push({
        key: 'scope-international-friendly',
        title: 'This view',
        body: 'International friendly prefers scholarships that mention international students, foreign nationals, visas, or similar in our catalog. The audience setting matches “International students & others” below when it is selected.'
      });
    }
    if (activeTab === 'best-recommendation') {
      out.push({
        key: 'scope-best-profile',
        title: 'Best recommendations',
        body: 'We use your profile (GPA, school level, field of study, state, citizenship) to rank results and sometimes apply extra database filters. A few rules may not map to a single checkbox in this panel.',
        learnMoreHref: '/account',
        learnMoreLabel: 'Edit profile'
      });
    }
    return out;
  }, [activeTab, parsedList.audience]);

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
      if (activeTab === 'recommended') {
        const nextWithBase =
          routeBaseMoreFilters != null
            ? mergeMoreFilterStates(routeBaseMoreFilters, next)
            : cloneMoreFilters(next);
        const hasSelections = countMoreFilterSelections(nextWithBase, filterBounds) > 0;
        setRecommendedAppliedFilters(hasSelections ? cloneMoreFilters(next) : null);
        if (!hasSelections) {
          commitSavedFilterPresets(
            { presets: savedFilterPresets, activePresetId: null },
            { applyActiveToRecommended: false }
          );
        } else if (activeSavedFilterPresetId) {
          const now = new Date().toISOString();
          const snapshotState = cloneMoreFilters(next);
          const nextPresets = savedFilterPresets.map((preset) =>
            preset.id === activeSavedFilterPresetId
              ? {
                  ...preset,
                  snapshot: moreFiltersToJson(snapshotState),
                  updatedAt: now
                }
              : preset
          );
          commitSavedFilterPresets(
            { presets: nextPresets, activePresetId: activeSavedFilterPresetId },
            { applyActiveToRecommended: false }
          );

          if (isAuthenticated) {
            const mergedJson = moreFiltersToJson(nextWithBase);
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
          }
        }
      }
      replaceListingParams({
        deadline: next.deadlinePreset,
        audience: next.citizenshipAudience,
        resetPage: true
      });
    }
    setMoreFiltersOpen(false);
  }, [
    moreFiltersDraft,
    replaceListingParams,
    activeTab,
    routeBaseMoreFilters,
    filterBounds,
    activeSavedFilterPresetId,
    isAuthenticated,
    savedFilterPresets,
    commitSavedFilterPresets
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
    const previewBaseline =
      moreFiltersBaseline ?? defaultMoreFiltersFromBounds(filterBounds);
    const hasDraftDelta =
      countMoreFilterDeltaFromBaseline(moreFiltersDraft, previewBaseline) > 0;
    if (!hasDraftDelta) {
      setPreviewCount(totalCount);
      setLastKnownPreviewCount(totalCount);
      setPreviewCountLoading(false);
      return;
    }
    setPreviewCountLoading(true);
    let cancelled = false;
    const t = setTimeout(() => {
      const ids = userListIdsRef.current;
      const previewBaseFilters = mergeMoreFilterStates(
        routeBaseMoreFilters ?? defaultMoreFiltersFromBounds(filterBounds),
        moreFiltersDraft
      );
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
          withTabEnforcedMoreFilters(previewBaseFilters, activeTab)
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
    moreFiltersBaseline,
    totalCount,
    routeBaseMoreFilters,
    savedFiltersForHub,
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

  const blockingInitialLoad = isLoading && !hasInitialLoadCompleted;
  const resultCountForHeader =
    blockingInitialLoad ? null : headerTotalCount === null ? null : headerTotalCount;
  const rangeTotalForPager =
    headerTotalCount === null
      ? guestBestPreviewStaleMatchesTotal
        ? 0
        : totalCount
      : headerTotalCount;
  const showingFrom =
    !blockingInitialLoad && rangeTotalForPager > 0 ? listStart + 1 : null;
  const showingTo =
    !blockingInitialLoad && rangeTotalForPager > 0
      ? Math.min(listStart + SCHOLARSHIPS_PAGE_SIZE, rangeTotalForPager)
      : null;

  const showClearFilters =
    totalCount === 0 &&
    !blockingInitialLoad &&
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
      case 'from-email':
        return 'No scholarships from this email are available now. Open Saved or Matches to keep browsing.';
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
  const guestBestRecommendationEmptyHidden =
    hubTreatAsGuest && activeTab === 'best-recommendation';

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
            onSubscriptionRestrictedNav={openLockedCategoryWall}
            buildTabHref={routeScope?.providerSlug ? buildSidebarTabHref : undefined}
            internationalStudentsFilter={{
              active: internationalSidebarChecked,
              href: internationalFriendlyHref,
              onActivate: toggleInternationalAudienceSidebar,
              showGuestLock: false,
              showSubscriptionLock: false,
              onGuestRestrictedClick: openRegistrationWall,
              onSubscriptionRestrictedClick: openLockedCategoryWall
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
                catalogListingLocked={false}
                savedFilterBarHint={savedFilterBarHint}
                savedFilterPresetButtons={presetsForCurrentHubSection.map((preset) => ({
                  id: preset.id,
                  name: preset.name,
                  active: preset.id === activeSavedFilterPresetId
                }))}
                onSavedFilterPresetSelect={openManageSavedFilterPreset}
              />
              {activeTab === 'from-email' ? (
                <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
                  From email: showing scholarships from your digest link.
                </div>
              ) : null}

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
                    saveCompletedLandingQuizDraft(next.draft);
                    stashLandingQuizDraftForOnboardingMerge(next.draft);
                    void notifyQuizCompletionClient({
                      flow: 'best_recommendation_wizard',
                      landingPath: '/scholarships',
                      authState: isAuthenticated ? 'authenticated' : 'guest',
                      onceKey: `st_quiz_complete_best_recommendation_${isAuthenticated ? 'auth' : 'guest'}`
                    });
                    replaceListingParams({ resetPage: true });
                  }}
                />
              ) : blockingInitialLoad ? (
            <ScholarshipsBrandLoading density="compact" showTopAccentBar />
          ) : hasError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage || 'Failed to load scholarships.'}
            </div>
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
            <>
              {isLoading ? (
                <div className="mb-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 shadow-sm">
                  Updating scholarships and counts...
                </div>
              ) : null}
              {guestBestRecommendationEmptyHidden ? null : (
                guestPersonalizedEmpty ? (
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-sm sm:p-6">
                    <p className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
                      Want better scholarship matches?
                    </p>
                    <p className="mx-auto mt-3 max-w-3xl text-pretty text-base leading-relaxed text-slate-600 sm:mt-4 sm:text-lg">
                      Answer 5 quick questions about your background and goals, then we&apos;ll open
                      your Best recommendation list with scholarships tailored to you.
                    </p>
                    <div className="mt-5 sm:mt-6">
                      <Link
                        href="/onboarding"
                        className="inline-flex w-full items-center justify-center rounded-xl bg-black px-6 py-3 text-center text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.35)] transition duration-200 ease-out hover:bg-zinc-900 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.4)] sm:text-base"
                      >
                        Answer 5 questions and find scholarships
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200 bg-white px-5 py-10 text-center text-slate-600 shadow-sm">
                    <p className="text-base font-medium text-zinc-800">
                      {emptyMessage}
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
                )
              )}
            </>
          ) : (
            <>
              {isLoading ? (
                <div className="mb-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 shadow-sm">
                  Updating scholarships and counts...
                </div>
              ) : null}
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
                    isUnread={!viewedSet.has(s.id)}
                    saved={savedSet.has(s.id)}
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
                    onSubscriptionLockedCategoryClick={openLockedCategoryWall}
                    onLockedScholarshipNavigate={openLockedCategoryWall}
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
        onSubscriptionLockedAction={openLockedCategoryWall}
        contextNotices={moreFiltersPanelContextNotices}
      />
      <SaveFilterPresetModal
        open={isSavePresetModalOpen}
        value={presetNameDraft}
        error={presetNameError}
        saveSectionLabel={saveFilterSectionLabel}
        onChange={setPresetNameDraft}
        onClose={closeSavePresetModal}
        onSubmit={submitSavePresetModal}
      />
      <ManageSavedFilterPresetModal
        open={managedPresetId != null}
        presetName={managePresetNameDraft}
        error={managePresetError}
        onNameChange={setManagePresetNameDraft}
        onClose={closeManageSavedFilterPreset}
        onApply={applyManagedSavedFilterPreset}
        onDelete={deleteManagedSavedFilterPreset}
      />
      <ScholarshipRegistrationWallModal
        open={registrationWallOpen}
        onClose={closeRegistrationWall}
        variant={registrationWallVariant}
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
    <ScholarshipsHubQueryProvider>
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
    </ScholarshipsHubQueryProvider>
  );
}
