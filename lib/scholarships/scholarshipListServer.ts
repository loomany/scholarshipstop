import type { Database } from '@/types_db';
import { SCHOLARSHIPS_PAGE_SIZE } from '@/app/scholarships/scholarshipListUrl';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  isScholarshipUSA,
  normalizeCategoryId,
  SCHOLARSHIP_CATEGORY_ORDER,
  type ScholarshipCategoryId
} from '@/app/scholarships/scholarshipCategories';
import {
  cloneMoreFilters,
  defaultMoreFiltersFromBounds,
  gpaBucketIdsFromFilterChoice,
  type DeadlinePreset,
  type MoreFiltersState
} from '@/app/scholarships/moreFilters';
import {
  normalizeUsStateToCanonical,
  US_STATE_NAME_TO_CODE
} from '@/lib/constants/usStates';
import { DOMESTIC_OR_UNSPECIFIED_CITIZENSHIP } from '@/lib/constants/onboardingCitizenshipAndLocation';
import type { SortOption } from '@/app/scholarships/scholarshipSort';
import type { ScholarshipListTabId, ScholarshipSidebarCounts } from '@/app/scholarships/scholarshipTabs';
import type { LongTailSlug } from '@/app/scholarships/scholarshipLongTailPresets';
import {
  buildCategorySeoRelaxAttempts,
  buildLongTailSeoRelaxAttempts,
  buildSeoNuclearListingRequest,
  SEO_MIN_INDEXABLE_LIST_COUNT,
  seoRequestHasCatalogStateGeo
} from '@/lib/scholarships/seoScholarshipFallback';
import {
  LIST_CARD_SELECT,
  mapScholarshipRow,
  scholarshipListSelectWithCatalogSubjectJoin,
  type ScholarshipRow
} from '@/lib/scholarships/supabase';
import {
  buildScholarshipProfileFilterSeed,
  educationLevelIdsFromProfileSchoolLevel,
  mergeBestRecommendationFiltersFromProfile,
  profileCitizenshipNarrowFromCitizenship,
  stripHubProfileHardMatchMoreFilters,
  type ScholarshipProfileFilterSeed
} from '@/lib/scholarships/profileFilterDefaults';
import { NO_ESSAY_SQL_PARTS } from '@/lib/scholarships/noEssay';
import { buildBestRecommendationProfileGpaOrParts } from '@/lib/scholarships/bestRecommendationGpa';
import { computeHubProfileMatchPercent } from '@/lib/scholarships/hubProfileMatchScore';
import {
  scholarshipMatchProfileVersion,
  type ProfilesRow
} from '@/lib/scholarships/scholarshipMatch';
import { AWARD_SIGNAL_SEO_TAGS } from '@/lib/scholarships/seoTags/awardSignalTags';
import { isSeoCanonicalTag } from '@/lib/scholarships/seoTags/vocabulary';
import { requirementTypesToDbColumns } from '@/lib/scholarships/requirementTypeMapping';
import { countryLabelFromCode } from '@/lib/scholarships/countryEligibility/countries';
import {
  moreFiltersToJson,
  type MoreFiltersJson
} from '@/lib/scholarships/scholarshipListApiCodec';
import {
  compareScholarshipsByDeadlineState,
  getScholarshipDeadlineState
} from '@/lib/scholarships/scholarshipDeadlineState';
import { scholarshipDeadlineHasPassed } from '@/lib/scholarships/similarScholarships';
import { scholarshipDeadlineSortMs } from '@/lib/scholarships/scholarshipDeadlineTrust';
import type { createClient } from '@/utils/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

type ServerSupabaseClient = SupabaseClient<Database>;

/** PostgREST errors may omit `message`; Next.js surfaces empty `Error` text as “no message was provided”. */
function postgrestErrorToMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    const combined = [e.message, e.details, e.hint, e.code]
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean)
      .join(' | ');
    if (combined) return combined;
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Unknown database request error';
}

export type ScholarshipListScope = 'personalized' | 'catalog';

export type ScholarshipListQueryOpts = {
  countOnly?: boolean;
  includeMeta?: boolean;
  includeCategoryCounts?: boolean;
  isProSubscriber?: boolean;
};

type ScholarshipListMetaOpts = {
  includeCategoryCounts?: boolean;
  /** Reuse an already computed exact total when it matches sidebar Best recommendation semantics. */
  bestRecommendationCountOverride?: number;
  /** Reuse an already computed exact total when it matches sidebar Easy apply semantics. */
  easyApplyCountOverride?: number;
  /** Reuse an already computed exact total when it matches sidebar Matches semantics. */
  matchesCountOverride?: number;
  /** Guest SSR first-load: safe only where downstream patches always zero this count. */
  skipBestRecommendationSidebarCount?: boolean;
  /** Guest meta patch always zeroes these collection counts; skip exact DB work when safe. */
  skipGuestZeroedSidebarCounts?: boolean;
};

export type ScholarshipListMeta = {
  filterBounds: {
    amountMin: number;
    amountMax: number;
    applicantsMin: number;
    applicantsMax: number;
  };
  sidebarCounts: ScholarshipSidebarCounts;
  categoryCounts: Record<ScholarshipCategoryId, number>;
  countryCounts: Array<{ code: string; label: string; count: number }>;
  unspecifiedApplicantCountryCount: number;
  /** Hub: filled when personalized match index is available. */
  profileMatchSummary?: {
    field: string;
    level: string;
    gpa: string;
    citizenship: string;
    state: string;
  } | null;
  /** Structured defaults for Best match filters UI (derived from saved profile). */
  profileFilterSeed?: ScholarshipProfileFilterSeed | null;
  /** True when profile has enough signals for personalized bucket matching. */
  personalizedMatchReady?: boolean;
  /** Authenticated hub: saved preset persisted on the user profile. */
  savedFiltersSnapshotJson?: MoreFiltersJson | null;
  /** First paint can use bounds/profile fields while exact counts load in the background. */
  deferredCounts?: boolean;
  /**
   * Personalized hub: count in the “Matches” bucket after ignored + listing SQL filters (aligned with sidebar).
   * Catalog / fallback: raw index bucket size after ignored only.
   */
  matchedTotal?: number;
};

export type ScholarshipListRequest = {
  page: number;
  limit: number;
  sort: SortOption;
  tab: ScholarshipListTabId;
  q: string;
  providerSlug: string | null;
  /** Multi-select category filter (OR semantics). */
  categoryIds: Set<ScholarshipCategoryId>;
  /** Narrow listing to one catalog slug (category page). */
  categoryPageSlug: string | null;
  deadline: DeadlinePreset;
  stateCodes: string[];
  ignored: string[];
  saved: string[];
  started: string[];
  submitted: string[];
  moreFilters: MoreFiltersState;
  /** AND legacy long-tail base layers (SQL approximation). */
  longTailLegacySlugs: LongTailSlug[];
  /** When set, skip tab/matches logic and return similar rows. */
  similarToId: string | null;
  similarCategorySlug: string | null;
  /**
   * Optional US state code (e.g. CA) for `get_scored_similar_scholarships` scoring.
   */
  similarStateSlug: string | null;
  /** `catalog` = full directory (All); `personalized` = SQL profile-fit + tab scopes. */
  listScope: ScholarshipListScope;
  /** Legacy field; catalog-only listing ignores this. */
  personalizedProfile?: ProfilesRow | null;
  /**
   * When non-empty, require `scholarships.seo_tags` to contain all listed canonical tags (AND).
   * Used for manifest SEO listings; omit for hub / category / generic catalog.
   */
  requiredSeoTags: string[];
  /**
   * L2 browse taxonomy: filter via `scholarship_categories` inner join (not legacy `category_slug` / tags).
   * Set by the API when `categories.slug` is an active level-2 row.
   */
  catalogSubjectCategoryId: string | null;
  /**
   * Hub: optional “Saved filters” snapshot for sidebar `recommended` count when the active
   * listing uses different `moreFilters`. `undefined` = omit (legacy). `null` = no saved preset (count 0).
   */
  savedFiltersSnapshot?: MoreFiltersState | null;
};

export type SeoListingFallbackMeta = {
  used: boolean;
  /** 0 = exact filters matched; ≥1 = Nth relax tier produced rows */
  tier: number;
  exactTotal: number;
  /** True when displayed count is below SEO index threshold (noindex + canonical widen). */
  thinListing: boolean;
};

export type ScholarshipListResult = {
  scholarships: Scholarship[];
  total: number;
  page: number;
  limit: number;
  meta?: ScholarshipListMeta;
  errorMessage?: string;
  /** Free plan: extra matches exist beyond `visibleMax`. */
  matchPaywall?: { lockedCount: number; visibleMax: number };
  /** Long-tail / category SEO listing relax metadata (API only). */
  seoFallback?: SeoListingFallbackMeta;
};

const DEFAULT_LIMIT = SCHOLARSHIPS_PAGE_SIZE;
const MAX_LIMIT = 50;
const SCHOLARSHIPS_LISTING_SOURCE = 'scholarships_listing_view';
const GLOBAL_FILTER_BOUNDS_TTL_MS = 5 * 60 * 1000;
const LIST_META_CACHE_TTL_MS = 120 * 1000;
const APPLICANT_COUNTRY_COUNTS_CACHE_TTL_MS = 5 * 60 * 1000;
let globalFilterBoundsCache:
  | {
      value: ScholarshipListMeta['filterBounds'];
      expiresAt: number;
    }
  | null = null;
let applicantCountryCountsCache:
  | {
      value: {
        countryCounts: ScholarshipListMeta['countryCounts'];
        unspecifiedApplicantCountryCount: number;
      };
      expiresAt: number;
    }
  | null = null;
const listMetaCache = new Map<
  string,
  {
    value: ScholarshipListMeta;
    expiresAt: number;
  }
>();

const EMPTY_SCHOLARSHIP_SIDEBAR_COUNTS: ScholarshipSidebarCounts = {
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

function buildEasyApplyOrParts(sel: Iterable<string>): string[] {
  const parts: string[] = [];
  for (const id of sel) {
    if (id === 'no_essay') parts.push(...NO_ESSAY_SQL_PARTS);
    else parts.push(`easy_apply_flags.cs.${JSON.stringify([id])}`);
  }
  return parts;
}

function readTtlValue<T>(entry: { value: T; expiresAt: number } | null | undefined): T | null {
  const now = Date.now();
  if (!entry || entry.expiresAt <= now) return null;
  return entry.value;
}

function writeTtlValue<T>(
  cache: Map<string, { value: T; expiresAt: number }>,
  key: string,
  value: T,
  ttlMs: number
): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

function cloneScholarshipListMeta(meta: ScholarshipListMeta): ScholarshipListMeta {
  return {
    filterBounds: { ...meta.filterBounds },
    sidebarCounts: { ...meta.sidebarCounts },
    categoryCounts: { ...meta.categoryCounts },
    countryCounts: (meta.countryCounts ?? []).map((country) => ({ ...country })),
    unspecifiedApplicantCountryCount: meta.unspecifiedApplicantCountryCount ?? 0,
    profileMatchSummary: meta.profileMatchSummary
      ? { ...meta.profileMatchSummary }
      : meta.profileMatchSummary,
    profileFilterSeed: meta.profileFilterSeed
      ? {
          ...meta.profileFilterSeed,
          educationLevelIds: [...meta.profileFilterSeed.educationLevelIds],
          gpaBucketIds: [...meta.profileFilterSeed.gpaBucketIds],
          eligibilityIds: [...meta.profileFilterSeed.eligibilityIds]
        }
      : meta.profileFilterSeed,
    personalizedMatchReady: meta.personalizedMatchReady,
    savedFiltersSnapshotJson: meta.savedFiltersSnapshotJson
      ? { ...meta.savedFiltersSnapshotJson }
      : meta.savedFiltersSnapshotJson,
    deferredCounts: meta.deferredCounts,
    matchedTotal: meta.matchedTotal
  };
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function listingFrom(supabase: ServerSupabaseClient): any {
  return (supabase as any).from(SCHOLARSHIPS_LISTING_SOURCE);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDeadlineStateTerminal(s: Scholarship): boolean {
  const state = getScholarshipDeadlineState(s);
  return state === 'expired' || state === 'broken';
}

function applyDeadlineStateSafetyOrder<T extends Scholarship>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aTerminal = isDeadlineStateTerminal(a);
    const bTerminal = isDeadlineStateTerminal(b);
    if (!aTerminal && !bTerminal) return 0;
    return compareScholarshipsByDeadlineState(a, b);
  });
}

function compareDeadlineStateSafetyOrder(
  a: Scholarship,
  b: Scholarship
): number {
  const aTerminal = isDeadlineStateTerminal(a);
  const bTerminal = isDeadlineStateTerminal(b);
  if (!aTerminal && !bTerminal) return 0;
  return compareScholarshipsByDeadlineState(a, b);
}

export function parseCommaUuids(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[0-9a-f-]{36}$/i.test(s));
}

export function parseCommaCategories(
  raw: string | null | undefined
): Set<ScholarshipCategoryId> {
  const out = new Set<ScholarshipCategoryId>();
  if (!raw?.trim()) return out;
  for (const part of raw.split(',')) {
    const id = normalizeCategoryId(part);
    if (id) out.add(id);
  }
  return out;
}

export function parseCommaStateCodes(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z]{2}$/.test(s));
}

function normalizeStateNameOrCodeToCode(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  const upper = t.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  const canonicalName = normalizeUsStateToCanonical(t);
  if (!canonicalName) return null;
  const code = US_STATE_NAME_TO_CODE[canonicalName];
  return code ? code.toUpperCase() : null;
}

export function savedFiltersSnapshotJsonFromProfile(
  profile: ProfilesRow | null | undefined
): MoreFiltersJson | null {
  const raw = profile?.saved_filters_snapshot;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  return raw as unknown as MoreFiltersJson;
}

/** `similar_state_slug` query param → 2-letter code for RPC (or null). */
function normalizeSimilarStateSlugParam(
  raw: string | null | undefined
): string | null {
  return normalizeStateNameOrCodeToCode(raw);
}

/** Allowlisted, deduped, sorted — safe for PostgREST `seo_tags` filter. */
export function sanitizeRequiredSeoTagsInput(
  raw: string[] | null | undefined
): string[] {
  if (!raw?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    const t = String(s).trim();
    if (!t || !isSeoCanonicalTag(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  out.sort();
  return out;
}

/**
 * Map `/scholarships/category/{slug}` to either legacy L1 (`category_slug`) or L2 join (`catalogSubjectCategoryId`).
 */
export async function resolveCatalogSubjectCategoryForPageSlug(
  supabase: ServerSupabaseClient,
  categoryPageSlug: string | null | undefined
): Promise<{
  legacyCategoryPageSlug: string | null;
  catalogSubjectCategoryId: string | null;
}> {
  const raw = categoryPageSlug?.trim().toLowerCase();
  if (!raw) {
    return { legacyCategoryPageSlug: null, catalogSubjectCategoryId: null };
  }
  if (normalizeCategoryId(raw)) {
    return { legacyCategoryPageSlug: raw, catalogSubjectCategoryId: null };
  }
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', raw)
    .eq('level', 2)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(postgrestErrorToMessage(error));
  const categoryRow = data as { id: string } | null;
  if (categoryRow?.id) {
    return { legacyCategoryPageSlug: null, catalogSubjectCategoryId: categoryRow.id };
  }
  return { legacyCategoryPageSlug: raw, catalogSubjectCategoryId: null };
}

/** URLSearchParams / JSON body → request (caller resolves sort/tab/deadline from existing parsers). */
export function scholarshipListRequestFromParts(parts: {
  page?: string | number | null;
  limit?: string | number | null;
  sort: SortOption;
  tab: ScholarshipListTabId;
  q?: string | null;
  providerSlug?: string | null;
  category?: string | null;
  categoryPageSlug?: string | null;
  deadline: DeadlinePreset;
  state?: string | null;
  ignored?: string | null;
  saved?: string | null;
  started?: string | null;
  submitted?: string | null;
  moreFilters: MoreFiltersState;
  longTailLegacySlugs?: string[] | null;
  similarTo?: string | null;
  similarCategorySlug?: string | null;
  similarStateSlug?: string | null;
  listScope?: string | null;
  requiredSeoTags?: string[] | null;
  catalogSubjectCategoryId?: string | null;
}): ScholarshipListRequest {
  const page = clampInt(
    typeof parts.page === 'number'
      ? parts.page
      : Number.parseInt(String(parts.page ?? '1'), 10),
    1,
    50000
  );
  const limit = clampInt(
    typeof parts.limit === 'number'
      ? parts.limit
      : Number.parseInt(String(parts.limit ?? String(DEFAULT_LIMIT)), 10),
    1,
    MAX_LIMIT
  );
  const lt = (parts.longTailLegacySlugs ?? [])
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean) as LongTailSlug[];

  return {
    page,
    limit,
    sort: parts.sort,
    tab: parts.tab,
    q: parts.q?.trim() ?? '',
    providerSlug: parts.providerSlug?.trim() || null,
    categoryIds: parseCommaCategories(parts.category ?? null),
    categoryPageSlug: parts.categoryPageSlug?.trim() || null,
    deadline: parts.deadline,
    stateCodes: parseCommaStateCodes(parts.state ?? null),
    ignored: parseCommaUuids(parts.ignored ?? null),
    saved: parseCommaUuids(parts.saved ?? null),
    started: parseCommaUuids(parts.started ?? null),
    submitted: parseCommaUuids(parts.submitted ?? null),
    moreFilters: parts.moreFilters,
    longTailLegacySlugs: lt,
    similarToId: parts.similarTo?.trim() || null,
    similarCategorySlug: parts.similarCategorySlug?.trim().toLowerCase() || null,
    similarStateSlug: normalizeSimilarStateSlugParam(parts.similarStateSlug),
    /** Hub/catalog listing is always catalog; `scope` URL param is ignored. */
    listScope: 'catalog',
    requiredSeoTags: sanitizeRequiredSeoTagsInput(parts.requiredSeoTags ?? null),
    catalogSubjectCategoryId: parts.catalogSubjectCategoryId?.trim() || null
  };
}

export async function fetchGlobalFilterBounds(
  supabase: ServerSupabaseClient
): Promise<ScholarshipListMeta['filterBounds']> {
  const now = Date.now();
  if (globalFilterBoundsCache && globalFilterBoundsCache.expiresAt > now) {
    return globalFilterBoundsCache.value;
  }
  const fallback = {
    amountMin: 0,
    amountMax: 50000,
    applicantsMin: 0,
    applicantsMax: 200000
  };
  try {
    const [{ data: minA }, { data: maxA }, { data: minP }, { data: maxP }] =
      await Promise.all([
        listingFrom(supabase)
          .select('award_amount_numeric_sort')
          .eq('is_active', true)
          .not('award_amount_numeric_sort', 'is', null)
          .order('award_amount_numeric_sort', { ascending: true, nullsFirst: false })
          .limit(1)
          .maybeSingle(),
        listingFrom(supabase)
          .select('award_amount_numeric_sort')
          .eq('is_active', true)
          .not('award_amount_numeric_sort', 'is', null)
          .order('award_amount_numeric_sort', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle(),
        listingFrom(supabase)
          .select('applicants_count')
          .eq('is_active', true)
          .not('applicants_count', 'is', null)
          .order('applicants_count', { ascending: true, nullsFirst: false })
          .limit(1)
          .maybeSingle(),
        listingFrom(supabase)
          .select('applicants_count')
          .eq('is_active', true)
          .not('applicants_count', 'is', null)
          .order('applicants_count', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle()
      ]);
    const amin = (minA as { award_amount_numeric_sort: number | null } | null)
      ?.award_amount_numeric_sort;
    const amax = (maxA as { award_amount_numeric_sort: number | null } | null)
      ?.award_amount_numeric_sort;
    const pmin = (minP as { applicants_count: number | null } | null)?.applicants_count;
    const pmax = (maxP as { applicants_count: number | null } | null)?.applicants_count;
    /**
     * Bounds drive the amount slider only. Rows with NULL `award_amount_numeric_sort`
     * still pass the listing query when `payout_method = non_monetary` or `seo_tags`
     * overlaps `award_signal_*` (see `applyMoreFilters`).
     */
    const value = {
      amountMin: amin != null && Number.isFinite(Number(amin)) ? Math.floor(Number(amin)) : fallback.amountMin,
      amountMax: amax != null && Number.isFinite(Number(amax)) ? Math.ceil(Number(amax)) : fallback.amountMax,
      applicantsMin:
        pmin != null && Number.isFinite(Number(pmin)) ? Math.floor(Number(pmin)) : fallback.applicantsMin,
      applicantsMax:
        pmax != null && Number.isFinite(Number(pmax)) ? Math.ceil(Number(pmax)) : fallback.applicantsMax
    };
    globalFilterBoundsCache = {
      value,
      expiresAt: now + GLOBAL_FILTER_BOUNDS_TTL_MS
    };
    return value;
  } catch {
    return fallback;
  }
}

function applyCategoryOrFilter(q: any, slugKeys: string[]): any {
  if (slugKeys.length === 0) return q;
  const parts: string[] = [];
  for (const k of slugKeys) {
    parts.push(`category_slug.eq.${k}`);
    parts.push(`tags.cs.${JSON.stringify([k])}`);
  }
  return q.or(parts.join(','));
}

function applySelectedCategoriesFilter(
  q: any,
  selected: Set<ScholarshipCategoryId>
): any {
  if (selected.size === 0) return q;
  const parts: string[] = [];
  for (const id of Array.from(selected)) {
    parts.push(`category_slug.eq.${id}`);
    parts.push(`tags.cs.${JSON.stringify([id])}`);
  }
  return q.or(parts.join(','));
}

function applyCategoryPageScope(q: any, slug: string): any {
  const raw = slug.trim().toLowerCase();
  if (!raw) return q;
  const canonical = normalizeCategoryId(raw);
  const keys = Array.from(
    new Set([raw].concat(canonical ? [canonical] : []))
  );
  return applyCategoryOrFilter(q, keys);
}

/**
 * Manifest `filters.includeEligibility` uses catalog tag ids. Some topics are only reflected
 * in free text (title / summary / description), not in `eligibility_tags`.
 * Strip those ids before `eligibility_tags.cs` and require a matching OR ilike instead.
 */
const ELIGIBILITY_TAG_TEXT_OR_ILIKE: Record<
  string,
  readonly { column: string; needle: string }[]
> = {
  first_generation: [
    { column: 'title', needle: 'first generation' },
    { column: 'title', needle: 'first-generation' },
    { column: 'summary_short', needle: 'first generation' },
    { column: 'summary_short', needle: 'first-generation' },
    { column: 'description', needle: 'first generation' },
    { column: 'requirements_text', needle: 'first generation' }
  ]
};

function sanitizeIlikeFragment(raw: string): string {
  return raw.replace(/[%_]/g, '').trim();
}

/** Mutates `moreFilters.includeEligibility`; returns `q` with an extra AND (OR ilike…) when needed. */
function applyEligibilityTextSearchClauses(
  q: any,
  moreFilters: MoreFiltersState
): any {
  const orParts: string[] = [];
  for (const tagId of Array.from(moreFilters.includeEligibility)) {
    const clauses = ELIGIBILITY_TAG_TEXT_OR_ILIKE[tagId];
    if (!clauses?.length) continue;
    moreFilters.includeEligibility.delete(tagId);
    for (const { column, needle } of clauses) {
      const safe = sanitizeIlikeFragment(needle);
      if (!safe) continue;
      orParts.push(`${column}.ilike.%${safe}%`);
    }
  }
  if (orParts.length === 0) return q;
  return q.or(orParts.join(','));
}

function applyLegacyLongTailBase(q: any, slug: LongTailSlug): any {
  switch (slug) {
    case 'closing-soon':
      return q.in('deadline_bucket', ['lt_1d', 'd1_7']);
    case 'undergraduate':
      return q.or(
        [
          'study_levels.cs.["undergraduate"]',
          'study_levels.cs.["bachelor"]',
          'study_levels.cs.["associate"]',
          'title.ilike.%undergraduate%',
          'summary_short.ilike.%undergraduate%'
        ].join(',')
      );
    case 'high-school':
      return q.or(
        [
          'study_levels.cs.["high school"]',
          'title.ilike.%high school%',
          'summary_short.ilike.%high school%'
        ].join(',')
      );
    case 'international-students':
      return q.or(
        [
          'title.ilike.%international student%',
          'summary_short.ilike.%international student%',
          'title.ilike.%foreign student%',
          'summary_short.ilike.%foreign student%',
          'title.ilike.%f-1%',
          'summary_short.ilike.%f-1%',
          'title.ilike.%foreign national%',
          'summary_short.ilike.%foreign national%',
          'eligibility_tags.cs.["international_students"]',
          'citizenship_statuses.cs.["international_student"]',
          'citizenship_statuses.cs.["international_students"]',
          'citizenship_statuses.cs.["international"]'
        ].join(',')
      );
    case 'engineering':
      return q.or(
        [
          'field_of_study.cs.["engineering"]',
          'title.ilike.%engineering%',
          'summary_short.ilike.%engineering%'
        ].join(',')
      );
    case 'computer-science':
      return q.or(
        [
          'field_of_study.cs.["computer science"]',
          'title.ilike.%computer science%',
          'summary_short.ilike.%computer science%',
          'title.ilike.%software%',
          'summary_short.ilike.%programming%'
        ].join(',')
      );
    default:
      return q;
  }
}

function applyDeadlinePreset(q: any, preset: DeadlinePreset): any {
  if (preset === 'any') return q;
  const map: Record<string, string> = {
    lt1d: 'lt_1d',
    d1_7: 'd1_7',
    w1_4: 'd8_28',
    gt4w: 'gt_28'
  };
  const b = map[preset];
  return b ? q.eq('deadline_bucket', b) : q;
}

/**
 * SEO listings use `seo_tags` as the primary audience/topic filter.
 * Strip legacy include-* / payout / completeness / exclusions so we do not AND
 * conflicting `eligibility_tags` / ILIKE / long-tail SQL on top of `requiredSeoTags`.
 * Keeps: deadline, amount & applicants bounds, `includeLocationLabels` (state / nationwide).
 */
function moreFiltersReducedForSeoListing(base: MoreFiltersState): MoreFiltersState {
  const f = cloneMoreFilters(base);
  f.includeEligibility.clear();
  f.includeEducationLevels.clear();
  f.includeGpaBuckets.clear();
  f.gpaChoice = '';
  f.includeEasyApply.clear();
  f.dataCompleteness = {
    low: false,
    medium: false,
    high: false,
    verified: false
  };
  f.payout = {
    college: false,
    student: false,
    nonMonetary: false,
    notStated: false
  };
  return f;
}

function applyMoreFilters(q: any, f: MoreFiltersState): any {
  q = applyDeadlinePreset(q, f.deadlinePreset);

  /**
   * Amount slider: non-monetary payout OR numeric amount within bounds OR canonical
   * `award_signal_*` tags (full ride / no dollar line — see awardSignalTags.ts).
   */
  const amountRange = `and(award_amount_numeric_sort.gte.${f.amountMin},award_amount_numeric_sort.lte.${f.amountMax})`;
  const awardSignalPart =
    AWARD_SIGNAL_SEO_TAGS.length > 0
      ? `,seo_tags.ov.{${AWARD_SIGNAL_SEO_TAGS.join(',')}}`
      : '';
  const payoutAmountOrAwardSignal = `payout_method.eq.non_monetary,${amountRange}${awardSignalPart}`;
  q = q.or(payoutAmountOrAwardSignal);

  q = q
    .or(`applicants_count.is.null,and(applicants_count.gte.${f.applicantsMin},applicants_count.lte.${f.applicantsMax})`);

  const includedRequirementTypes = Array.from(f.includeRequirementTypes);
  const requirementOrParts = requirementTypesToDbColumns(includedRequirementTypes).map(
    (field) => `${field}.eq.true`
  );
  if (requirementOrParts.length > 0) {
    q = q.or(requirementOrParts.join(','));
  }

  const dc = f.dataCompleteness;
  const dcAny = dc.low || dc.medium || dc.high || dc.verified;
  if (dcAny) {
    const buckets: string[] = [];
    if (dc.low) buckets.push('basic_info');
    if (dc.medium) buckets.push('standard_detail');
    if (dc.high) buckets.push('detailed_listing');
    if (dc.verified) buckets.push('verified_listing');
    if (buckets.length > 0) {
      q = q.in('listing_completeness_bucket', buckets);
    }
  }

  const po = f.payout;
  const poAny =
    po.college || po.student || po.nonMonetary || po.notStated;
  if (poAny) {
    const parts: string[] = [];
    if (po.college) parts.push('payout_method.eq.college');
    if (po.student) parts.push('payout_method.eq.student');
    if (po.nonMonetary) parts.push('payout_method.eq.non_monetary');
    if (po.notStated) parts.push('payout_method.eq.not_stated');
    q = q.or(parts.join(','));
  }

  const addIncludeCs = (col: string, sel: Set<string>) => {
    if (sel.size === 0) return;
    const parts = Array.from(sel).map((id) => `${col}.cs.${JSON.stringify([id])}`);
    q = q.or(parts.join(','));
  };
  const addIncludeEasyApply = (sel: Set<string>) => {
    if (sel.size === 0) return;
    const parts = buildEasyApplyOrParts(sel);
    if (parts.length > 0) q = q.or(parts.join(','));
  };
  addIncludeCs('eligibility_tags', f.includeEligibility);
  if (
    f.includeApplicantCountryCodes.size > 0 ||
    f.includeUnspecifiedApplicantCountries
  ) {
    const parts = Array.from(f.includeApplicantCountryCodes).map(
      (code) => `applicant_country_codes.cs.${JSON.stringify([code])}`
    );
    if (f.includeUnspecifiedApplicantCountries) {
      parts.push('applicant_country_codes.eq.[]');
    }
    q = q.or(parts.join(','));
  }
  const profileEducationLevelIds = educationLevelIdsFromProfileSchoolLevel(
    f.profileSchoolLevelSlug
  );
  const effectiveEducationLevelIds = new Set([
    ...Array.from(f.includeEducationLevels),
    ...profileEducationLevelIds
  ]);
  if (effectiveEducationLevelIds.size > 0) {
    const eduParts: string[] = [];
    for (const id of effectiveEducationLevelIds) {
      const j = JSON.stringify([id]);
      eduParts.push(`catalog_education_levels.cs.${j}`);
      eduParts.push(`study_levels.cs.${j}`);
    }
    q = q.or(eduParts.join(','));
  }
  const effectiveGpaBucketIds = new Set([
    ...Array.from(f.includeGpaBuckets),
    ...gpaBucketIdsFromFilterChoice(f.gpaChoice)
  ]);
  if (effectiveGpaBucketIds.size > 0) {
    q = q.in('gpa_bucket', Array.from(effectiveGpaBucketIds));
  }
  if (f.includeLocationLabels.size > 0) {
    /**
     * DB canonical values are USPS state codes in `location_tags` (e.g. "FL").

     */
    const normalizedLocationTags = new Set<string>();
    for (const raw of Array.from(f.includeLocationLabels)) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      const code = normalizeStateNameOrCodeToCode(trimmed);
      if (code) normalizedLocationTags.add(code);
    }
    addIncludeCs('location_tags', normalizedLocationTags);
  }
  addIncludeEasyApply(f.includeEasyApply);

  const stateCode = normalizeStateNameOrCodeToCode(f.filterStateInput);
  if (stateCode) {
    /**
     * `filterStateInput` comes from the state autocomplete (full names like "Florida").
     *
     * Data is currently split across two geo fields:
     * - `state_codes` (jsonb array)
     * - `location_tags` (jsonb array; canonical USPS codes such as "FL")
     *
     * Restricting this input to only `state_codes` can return false-empty results when
     * a row only has `location_tags`. Keep this as an OR across both.
     */
    const stateJson = JSON.stringify([stateCode]);
    q = q.or(`state_codes.cs.${stateJson},location_tags.cs.${stateJson}`);
  }

  const fos = f.profileFieldOfStudySlug?.trim().toLowerCase() ?? '';
  if (fos) {
    const j = JSON.stringify([fos]);
    const safe = fos.replace(/[%_]/g, '').slice(0, 64);
    const fosParts = [`field_of_study.cs.${j}`];
    if (safe.length > 0) {
      fosParts.push(`title.ilike.%${safe}%`);
      fosParts.push(`summary_short.ilike.%${safe}%`);
    }
    q = q.or(fosParts.join(','));
  }

  const effectiveProfileCitizenshipNarrow =
    f.profileCitizenshipNarrow !== 'none'
      ? f.profileCitizenshipNarrow
      : profileCitizenshipNarrowFromCitizenship(f.profileCitizenshipStatus);
  if (effectiveProfileCitizenshipNarrow === 'us_domestic') {
    q = q.or(
      [
        'citizenship_statuses.cs.["us_citizen"]',
        'citizenship_statuses.cs.["us"]',
        'citizenship_statuses.cs.["domestic"]',
        'citizenship_statuses.cs.["us_permanent_resident"]',
        'eligibility_tags.cs.["us_citizens"]',
        'eligibility_tags.cs.["us_students"]'
      ].join(',')
    );
  }

  const effectiveCitizenshipAudience =
    f.citizenshipAudience === 'international_friendly' ||
    f.profileCitizenshipStatus.trim().toLowerCase() === 'international_student'
      ? 'international_friendly'
      : 'any';
  if (effectiveCitizenshipAudience === 'international_friendly') {
    /**
     * `international_friendly_listing` is maintained in DB (see migration) with the same
     * disjunction as the legacy OR below — btree-friendly vs many `ilike` on text blobs.
     * Opt-in legacy: SCHOLARSHIPS_INTL_LEGACY_OR=1 (diagnostics / emergency rollback only).
     */
    if (process.env.SCHOLARSHIPS_INTL_LEGACY_OR === '1') {
      const intlParts = [
        'title.ilike.%international student%',
        'summary_short.ilike.%international student%',
        'title.ilike.%foreign student%',
        'summary_short.ilike.%foreign student%',
        'title.ilike.%foreign national%',
        'summary_short.ilike.%foreign national%',
        'title.ilike.%f-1%',
        'summary_short.ilike.%f-1%',
        'description.ilike.%international student%',
        'description.ilike.%foreign student%',
        'requirements_text.ilike.%international student%',
        'requirements_text.ilike.%foreign student%',
        'eligibility_text.ilike.%international student%',
        'eligibility_text.ilike.%foreign student%',
        'citizenship_statuses.cs.["international"]',
        'citizenship_statuses.cs.["international_students"]',
        /** Canonical slug from catalog parsers (`scholarship_taxonomy` citizenship rules). */
        'citizenship_statuses.cs.["international_student"]',
        'eligibility_tags.cs.["international_students"]'
      ];
      q = q.or(intlParts.join(','));
    } else {
      q = q.eq('international_friendly_listing', true);
    }
  }

  return q;
}

function applyBestRecommendationProfileGpaFilter(
  req: ScholarshipListRequest,
  q: any
): any {
  if (req.tab !== 'best-recommendation') return q;
  if (req.moreFilters.includeApplicantCountryCodes.size > 0) return q;
  if (req.moreFilters.includeGpaBuckets.size > 0) return q;
  if (gpaBucketIdsFromFilterChoice(req.moreFilters.gpaChoice).length > 0) return q;
  const orParts = buildBestRecommendationProfileGpaOrParts(
    req.personalizedProfile ?? null
  );
  if (orParts.length === 0) return q;
  return q.or(orParts.join(','));
}

function applyBestRecommendationNoCitizenshipListedFilter(
  req: ScholarshipListRequest,
  q: any
): any {
  if (req.tab !== 'best-recommendation') return q;
  const raw = req.personalizedProfile?.citizenship_status?.trim().toLowerCase() ?? '';
  if (raw !== DOMESTIC_OR_UNSPECIFIED_CITIZENSHIP) return q;
  return q.or('citizenship_statuses.eq.[]');
}

function applySort(q: any, sort: SortOption): any {
  q = q.order('is_expired', { ascending: true, nullsFirst: false });
  switch (sort) {
    case 'highest_amount':
      return q
        .order('award_amount_numeric_sort', { ascending: false, nullsFirst: false })
        .order('ranking_score', { ascending: false, nullsFirst: false });
    case 'least_requirements':
      return q
        .order('requirements_sort_value', { ascending: true, nullsFirst: false })
        .order('ranking_score', { ascending: false, nullsFirst: false });
    case 'closest_deadline':
      return q
        .order('deadline_date', { ascending: true, nullsFirst: false })
        .order('days_until_deadline', { ascending: true, nullsFirst: false })
        .order('ranking_score', { ascending: false, nullsFirst: false });
    case 'fewest_applicants':
      return q
        .order('applicants_sort_value', { ascending: true, nullsFirst: false })
        .order('ranking_score', { ascending: false, nullsFirst: false });
    case 'most_recent':
      return q
        .order('updated_at', { ascending: false, nullsFirst: true })
        .order('ranking_score', { ascending: false, nullsFirst: false });
    case 'verified_first':
      return q
        .order('verified_sort_key', { ascending: true, nullsFirst: false })
        .order('ranking_score', { ascending: false, nullsFirst: false });
    case 'magic':
    case 'best_match':
    case 'best_recommendation':
    case 'lowest_amount':
    default:
      return q
        .order('ranking_score', { ascending: false, nullsFirst: false })
        .order('deadline_date', { ascending: true, nullsFirst: false })
        .order('days_until_deadline', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: true });
  }
}

function applyTabScopeFixed(req: ScholarshipListRequest, q: any): any {
  const { tab, ignored, saved, started, submitted } = req;
  switch (tab) {
    case 'best-recommendation': {
      if (ignored.length > 0) {
        for (let i = 0; i < ignored.length; i += 120) {
          const chunk = ignored.slice(i, i + 120);
          q = q.not('id', 'in', `(${chunk.join(',')})`);
        }
      }
      return q;
    }
    case 'matches':
      if (ignored.length > 0) {
        for (let i = 0; i < ignored.length; i += 120) {
          const chunk = ignored.slice(i, i + 120);
          q = q.not('id', 'in', `(${chunk.join(',')})`);
        }
      }
      return q;
    case 'saved':
      if (saved.length === 0) return q.eq('id', '00000000-0000-0000-0000-000000000000');
      return q.in('id', saved);
    case 'from-email':
      if (saved.length === 0) return q.eq('id', '00000000-0000-0000-0000-000000000000');
      return q.in('id', saved);
    case 'ignored':
      if (ignored.length === 0) return q.eq('id', '00000000-0000-0000-0000-000000000000');
      return q.in('id', ignored);
    case 'started':
      if (started.length === 0) {
        return q.eq('id', '00000000-0000-0000-0000-000000000000');
      }
      return q.in('id', started);
    case 'submitted':
      if (submitted.length === 0) {
        return q.eq('id', '00000000-0000-0000-0000-000000000000');
      }
      return q.in('id', submitted);
    case 'recommended': {
      /** Saved Filters tab: same catalog scope as Matches; narrowing is via `moreFilters` only. */
      return applyTabScopeFixed({ ...req, tab: 'matches' }, q);
    }
    case 'easy-apply':
      return applyTabScopeFixed({ ...req, tab: 'matches' }, q);
    case 'hot-deadlines': {
      const nq = applyTabScopeFixed({ ...req, tab: 'matches' }, q);
      return nq
        .eq('is_expired', false)
        .not('deadline_date', 'is', null)
        .gte('deadline_date', todayIsoDate())
        .in('deadline_bucket', ['lt_1d', 'd1_7']);
    }
    default:
      return q;
  }
}

function baseSelect(
  supabase: ServerSupabaseClient,
  head: boolean,
  req: Pick<ScholarshipListRequest, 'catalogSubjectCategoryId'>
) {
  const sel = req.catalogSubjectCategoryId
    ? scholarshipListSelectWithCatalogSubjectJoin()
    : LIST_CARD_SELECT;
  if (head) {
    return listingFrom(supabase).select(sel, { count: 'exact', head: true });
  }
  return listingFrom(supabase).select(sel, { count: 'exact' });
}

/**
 * Hub/catalog text search: multi-field OR. Keeps ilike patterns simple; strips LIKE wildcards and commas
 * (commas break PostgREST `.or()` parsing).
 */
function applyCatalogTextSearchFilter(q: any, rawQ: string): any {
  const safe = rawQ.replace(/[%_,]/g, ' ').trim().replace(/\s+/g, ' ');
  if (safe.length === 0) return q;
  const pattern = `%${safe}%`;
  const cols = [
    'title',
    'provider_name',
    'summary_short',
    'summary_long',
    'requirements_text',
    'eligibility_text',
    'description',
    'official_source_name',
    'category'
  ];
  return q.or(cols.map((c) => `${c}.ilike.${pattern}`).join(','));
}

function applyCommonFilters(req: ScholarshipListRequest, q: any): any {
  const seoListing = req.requiredSeoTags.length > 0;
  q = q.eq('is_active', true);
  if (seoListing) {
    // eslint-disable-next-line no-console -- temporary SEO listing mode diagnostics
    console.log('SEO MODE ACTIVE - using seo_tags only');
    // eslint-disable-next-line no-console -- temporary SEO listing mode diagnostics
    console.log('SEO TAG FILTER', req.requiredSeoTags);
    // PostgREST `cs` for text[] expects a Postgres array literal `{a,b}`, not JSON `["a","b"]`.
    // supabase-js `.contains(column, string[])` encodes `cs.{a,b}` correctly.
    q = q.contains('seo_tags', req.requiredSeoTags);
  }
  if (!seoListing && req.q) {
    q = applyCatalogTextSearchFilter(q, req.q);
  }
  if (req.providerSlug) {
    q = q.eq('provider_slug', req.providerSlug);
  }
  if (req.catalogSubjectCategoryId) {
    q = q.eq('scholarship_categories.category_id', req.catalogSubjectCategoryId);
  } else if (req.categoryPageSlug) {
    q = applyCategoryPageScope(q, req.categoryPageSlug);
  } else if (req.categoryIds.size > 0) {
    q = applySelectedCategoriesFilter(q, req.categoryIds);
  }
  if (req.stateCodes.length > 0) {
    const parts = req.stateCodes.map(
      (c) => `state_codes.cs.${JSON.stringify([c])}`
    );
    q = q.or(parts.join(','));
  }
  if (!seoListing) {
    for (const slug of req.longTailLegacySlugs) {
      q = applyLegacyLongTailBase(q, slug);
    }
  }
  const moreFilters = seoListing
    ? moreFiltersReducedForSeoListing(req.moreFilters)
    : cloneMoreFilters(req.moreFilters);
  if (!seoListing && req.deadline && req.deadline !== 'any') {
    moreFilters.deadlinePreset = req.deadline;
  }
  if (!seoListing) {
    q = applyEligibilityTextSearchClauses(q, moreFilters);
  }
  q = applyMoreFilters(q, moreFilters);
  if (!seoListing) {
    q = applyBestRecommendationNoCitizenshipListedFilter(req, q);
    q = applyBestRecommendationProfileGpaFilter(req, q);
  }
  return q;
}

/**
 * Legacy “global nav” basis: strips text search, categories, and resets moreFilters to defaults.
 * Used only for **L1 category dropdown** counts (`categoryDropdownCountsRequest`), not sidebar tabs.
 */
function metaBasisRequest(
  req: ScholarshipListRequest,
  bounds: ScholarshipListMeta['filterBounds']
): ScholarshipListRequest {
  return {
    ...req,
    q: '',
    providerSlug: req.providerSlug,
    categoryIds: new Set(),
    categoryPageSlug: null,
    catalogSubjectCategoryId: null,
    moreFilters: defaultMoreFiltersFromBounds(bounds),
    page: 1,
    limit: 1
  };
}

/**
 * Sidebar counts are global for tab buckets and must ignore list-local refinements
 * (search text, category picks, sort, manual filter overlays, paging).
 */
function sidebarGlobalCountsBasisRequest(
  req: ScholarshipListRequest,
  bounds: ScholarshipListMeta['filterBounds']
): ScholarshipListRequest {
  return {
    ...req,
    q: '',
    sort: 'magic',
    categoryIds: new Set<ScholarshipCategoryId>(),
    categoryPageSlug: null,
    catalogSubjectCategoryId: null,
    deadline: 'any',
    stateCodes: [],
    moreFilters: defaultMoreFiltersFromBounds(bounds),
    page: 1,
    limit: 1
  };
}

/**
 * Category dropdown counts must follow the active tab baseline (same isolation family as sidebar meta):
 * keep tab preset context, but strip list-local overlays (q/category/page/sort/manual filters).
 */
function categoryDropdownCountsRequest(
  req: ScholarshipListRequest,
  bounds: ScholarshipListMeta['filterBounds']
): ScholarshipListRequest {
  const base = sidebarGlobalCountsBasisRequest(req, bounds);
  // "International Friendly" is a tab-context foundation for Matches (audience in URL),
  // so category counts must keep that baseline while still ignoring manual overlays.
  if (req.tab === 'matches') {
    base.moreFilters.citizenshipAudience = req.moreFilters.citizenshipAudience;
  }
  if (base.tab === 'best-recommendation') {
    return bestRecommendationRequest(base, bounds);
  }
  if (base.tab === 'easy-apply') {
    return easyApplyListCanonicalRequest(base);
  }
  if (base.tab === 'hot-deadlines') {
    return hotDeadlinesListCanonicalRequest(base);
  }
  return base;
}

function tabUsesEmptyIdSet(
  req: Pick<ScholarshipListRequest, 'ignored' | 'saved' | 'started' | 'submitted'>,
  tab: ScholarshipListTabId
): boolean {
  switch (tab) {
    case 'saved':
    case 'from-email':
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

function buildListMetaCacheKey(
  req: ScholarshipListRequest,
  bounds: ScholarshipListMeta['filterBounds'],
  includeCategoryCounts: boolean,
  opts?: ScholarshipListMetaOpts
): string {
  const stateCodes = Array.from(req.stateCodes).sort().join(',');
  const ignored = Array.from(req.ignored).sort().join(',');
  const saved = Array.from(req.saved).sort().join(',');
  const started = Array.from(req.started).sort().join(',');
  const submitted = Array.from(req.submitted).sort().join(',');
  const longTailLegacySlugs = Array.from(req.longTailLegacySlugs).sort().join(',');
  const requiredSeoTags = Array.from(req.requiredSeoTags).sort().join(',');
  const boundsKey = [
    bounds.amountMin,
    bounds.amountMax,
    bounds.applicantsMin,
    bounds.applicantsMax
  ].join(':');
  const qNorm = req.q.trim().toLowerCase();
  const categoryIds = Array.from(req.categoryIds)
    .slice()
    .sort()
    .join(',');
  const moreFiltersKey = JSON.stringify(moreFiltersToJson(req.moreFilters));
  const savedSnapKey =
    req.savedFiltersSnapshot === undefined
      ? ''
      : req.savedFiltersSnapshot === null
        ? 'null'
        : JSON.stringify(moreFiltersToJson(req.savedFiltersSnapshot));
  const profileKey = req.personalizedProfile
    ? `${req.personalizedProfile.id}:${scholarshipMatchProfileVersion(req.personalizedProfile)}`
    : 'none';
  return [
    req.tab,
    `bestMode:${opts?.skipBestRecommendationSidebarCount ? 'skip' : typeof opts?.bestRecommendationCountOverride === 'number' ? 'override' : 'live'}`,
    `easyMode:${typeof opts?.easyApplyCountOverride === 'number' ? 'override' : 'live'}`,
    `matchesMode:${typeof opts?.matchesCountOverride === 'number' ? 'override' : 'live'}`,
    `guestZeroed:${opts?.skipGuestZeroedSidebarCounts ? 'skip' : 'live'}`,
    savedSnapKey,
    req.deadline,
    req.listScope,
    `pf:${profileKey}`,
    includeCategoryCounts ? 'cats:1' : 'cats:0',
    `state:${stateCodes}`,
    `ignored:${ignored}`,
    `saved:${saved}`,
    `started:${started}`,
    `submitted:${submitted}`,
    `lt:${longTailLegacySlugs}`,
    `seo:${requiredSeoTags}`,
    `bounds:${boundsKey}`,
    `q:${qNorm}`,
    `provider:${req.providerSlug ?? ''}`,
    `catIds:${categoryIds}`,
    `catPage:${req.categoryPageSlug ?? ''}`,
    `catSubj:${req.catalogSubjectCategoryId ?? ''}`,
    `mf:${moreFiltersKey}`
  ].join('|');
}

async function fetchApplicantCountryCounts(
  supabase: ServerSupabaseClient
): Promise<{
  countryCounts: ScholarshipListMeta['countryCounts'];
  unspecifiedApplicantCountryCount: number;
}> {
  const cached = readTtlValue(applicantCountryCountsCache);
  if (cached) {
    return {
      countryCounts: cached.countryCounts.map((country) => ({ ...country })),
      unspecifiedApplicantCountryCount: cached.unspecifiedApplicantCountryCount
    };
  }

  const counts = new Map<string, number>();
  let unspecifiedApplicantCountryCount = 0;
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await listingFrom(supabase)
      .select('applicant_country_codes')
      .eq('is_active', true)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(postgrestErrorToMessage(error));
    const rows = (data ?? []) as Array<{ applicant_country_codes?: unknown }>;
    if (rows.length === 0) break;

    for (const row of rows) {
      const codes = Array.isArray(row.applicant_country_codes)
        ? row.applicant_country_codes
        : [];
      if (codes.length === 0) {
        unspecifiedApplicantCountryCount += 1;
        continue;
      }
      for (const raw of codes) {
        const code = String(raw).trim().toUpperCase();
        if (/^[A-Z]{2}$/.test(code)) counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  const value = {
    countryCounts: [...counts.entries()]
      .map(([code, count]) => ({
        code,
        label: countryLabelFromCode(code),
        count
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    unspecifiedApplicantCountryCount
  };
  applicantCountryCountsCache = {
    value: {
      countryCounts: value.countryCounts.map((country) => ({ ...country })),
      unspecifiedApplicantCountryCount: value.unspecifiedApplicantCountryCount
    },
    expiresAt: Date.now() + APPLICANT_COUNTRY_COUNTS_CACHE_TTL_MS
  };
  return value;
}

/** Single catalog pipeline: no personalized SQL branch. */
function effectiveListingRequest(req: ScholarshipListRequest): ScholarshipListRequest {
  const n = normalizeTabScopedMoreFilters(req);
  const base: ScholarshipListRequest = {
    ...n,
    listScope: 'catalog',
    personalizedProfile: undefined
  };
  if (base.tab === 'best-recommendation') {
    return { ...base, sort: 'magic' };
  }
  return base;
}

function bestRecommendationHasRelaxableHardFilters(req: ScholarshipListRequest): boolean {
  if (req.tab !== 'best-recommendation') return false;
  const f = req.moreFilters;
  return (
    f.includeEducationLevels.size > 0 ||
    f.includeGpaBuckets.size > 0 ||
    gpaBucketIdsFromFilterChoice(f.gpaChoice).length > 0 ||
    f.includeEligibility.size > 0 ||
    f.filterStateInput.trim().length > 0 ||
    f.profileSchoolLevelSlug.trim().length > 0 ||
    f.profileFieldOfStudySlug.trim().length > 0 ||
    f.profileCitizenshipStatus.trim().length > 0 ||
    f.profileCitizenshipNarrow !== 'none' ||
    f.citizenshipAudience !== 'any'
  );
}

function relaxBestRecommendationHardFilters(
  req: ScholarshipListRequest
): ScholarshipListRequest {
  return {
    ...req,
    moreFilters: stripHubProfileHardMatchMoreFilters(req.moreFilters)
  };
}

/** Canonical pipeline is catalog SQL; keep tab selection intact. */
export function applyCatalogOnlyListingNormalization(
  req: ScholarshipListRequest
): ScholarshipListRequest {
  return { ...req, listScope: 'catalog' };
}

function buildScholarshipListFilterQuery(
  supabase: ServerSupabaseClient,
  head: boolean,
  req: ScholarshipListRequest
): any {
  const r = effectiveListingRequest(req);
  let q: any = baseSelect(supabase, head, r);
  q = applyCommonFilters(r, q);
  q = applyTabScopeFixed(r, q);
  return q;
}

const SIDEBAR_COUNT_TIMING_ENABLED =
  process.env.SCHOLARSHIPS_SIDEBAR_COUNT_TIMING === '1';

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Head-count for a tab using the same SQL stack as the listing (for `matchedTotal` / diagnostics). */
export async function countScholarshipsForTabRequest(
  supabase: ServerSupabaseClient,
  req: ScholarshipListRequest,
  tab: ScholarshipListTabId,
  opts?: { countLabel?: string }
): Promise<number> {
  const label = opts?.countLabel ?? tab;
  const t0 = Date.now();
  let attempt = 1;
  const run = async () => {
    if (tabUsesEmptyIdSet(req, tab)) return 0;
    const r = { ...effectiveListingRequest(req), tab };
    const q: any = buildScholarshipListFilterQuery(supabase, true, r);
    const { error, count } = await q;
    if (error) throw new Error(postgrestErrorToMessage(error));
    const total = count ?? 0;
    if (total > 0 || !bestRecommendationHasRelaxableHardFilters(r)) {
      return total;
    }
    const relaxed = {
      ...effectiveListingRequest(relaxBestRecommendationHardFilters(r)),
      tab
    };
    const retryQ: any = buildScholarshipListFilterQuery(supabase, true, relaxed);
    const retry = await retryQ;
    if (retry.error) throw new Error(postgrestErrorToMessage(retry.error));
    return retry.count ?? 0;
  };
  try {
    return await run();
  } catch {
    attempt = 2;
    await sleepMs(50);
    return await run();
  } finally {
    if (SIDEBAR_COUNT_TIMING_ENABLED) {
      // eslint-disable-next-line no-console -- opt-in head-count performance diagnostics
      console.log(
        '[sidebar-count]',
        label,
        `${Date.now() - t0}ms`,
        `attempt=${attempt}`
      );
    }
  }
}

/**
 * Similar block: at most this many “deadline passed” cards.
 * Final order is always: open listings first (same category, then catalog backfill), then expired (for context).
 */
const SIMILAR_LIST_MAX_EXPIRED = 3;

/** Max rows loaded for in-memory profile match ranking (Best / Recommended). */
const PROFILE_SOFT_MATCH_SQL_WINDOW = 2500;

/**
 * Legacy similar pool (bounded window, category filter + deadline sort).
 * Used when `get_scored_similar_scholarships` is unavailable or returns no rows.
 */
async function loadSimilarScholarshipsLegacyRows(
  supabase: ServerSupabaseClient,
  req: ScholarshipListRequest
): Promise<ScholarshipRow[]> {
  let q = listingFrom(supabase)
    .select(LIST_CARD_SELECT)
    .eq('is_active', true)
    .neq('id', req.similarToId!);
  if (req.similarCategorySlug) {
    const raw = req.similarCategorySlug.trim().toLowerCase();
    const canon = normalizeCategoryId(raw);
    const keys = Array.from(
      new Set([raw].concat(canon ? [canon] : []))
    );
    q = applyCategoryOrFilter(q, keys);
  }
  const similarPoolSize = Math.min(120, Math.max(req.limit * 6, 36));
  q = q
    .order('is_expired', { ascending: true, nullsFirst: false })
    .order('deadline_date', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: false, nullsFirst: true })
    .range(0, Math.max(0, similarPoolSize - 1));
  const { data, error } = await q;
  if (error) throw new Error(postgrestErrorToMessage(error));
  return (data ?? []) as unknown as ScholarshipRow[];
}

async function fetchScoredSimilarScholarshipRows(
  supabase: ServerSupabaseClient,
  req: ScholarshipListRequest
): Promise<ScholarshipRow[] | null> {
  if (!req.similarToId) return null;
  const { data, error } = await supabase.rpc('get_scored_similar_scholarships', {
    target_id: req.similarToId,
    target_category_slug: req.similarCategorySlug ?? '',
    target_state_slug: req.similarStateSlug
  });
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(
        '[scholarships] get_scored_similar_scholarships RPC failed; using legacy similar query',
        error.message
      );
    }
    return null;
  }
  return (data ?? []) as ScholarshipRow[];
}

async function fetchSimilarListFillerScholarships(
  supabase: ServerSupabaseClient,
  excludeIds: string[],
  need: number
): Promise<Scholarship[]> {
  if (need <= 0) return [];
  const todayIso = new Date().toISOString().slice(0, 10);
  let q: any = listingFrom(supabase)
    .select(LIST_CARD_SELECT)
    .eq('is_active', true)
    .or(`deadline_date.gte.${todayIso},deadline_date.is.null`)
    .order('is_expired', { ascending: true, nullsFirst: false })
    .order('ranking_score', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false, nullsFirst: true });

  const uniqueExclude = Array.from(new Set(excludeIds.filter(Boolean)));
  for (let i = 0; i < uniqueExclude.length; i += 120) {
    const chunk = uniqueExclude.slice(i, i + 120);
    q = q.not('id', 'in', `(${chunk.join(',')})`);
  }

  const windowSize = Math.min(160, Math.max(need * 8, 32));
  const { data, error } = await q.range(0, windowSize - 1);
  if (error) throw new Error(postgrestErrorToMessage(error));
  const rows = (data ?? []) as unknown as ScholarshipRow[];
  const mapped = rows.map((r) => mapScholarshipRow(r));
  const out: Scholarship[] = [];
  for (const s of mapped) {
    if (out.length >= need) break;
    if (scholarshipDeadlineHasPassed(s)) continue;
    if (!isScholarshipUSA(s.country)) continue;
    out.push(s);
  }
  return out;
}

async function finalizeSimilarScholarshipsList(
  supabase: ServerSupabaseClient,
  fromCategoryOrdered: Scholarship[],
  similarToId: string,
  limit: number
): Promise<Scholarship[]> {
  const openFromCategory: Scholarship[] = [];
  const closedFromCategory: Scholarship[] = [];
  for (const s of fromCategoryOrdered) {
    if (scholarshipDeadlineHasPassed(s)) closedFromCategory.push(s);
    else openFromCategory.push(s);
  }

  const out: Scholarship[] = [];

  for (const s of openFromCategory) {
    if (out.length >= limit) break;
    out.push(s);
  }

  let need = limit - out.length;
  if (need > 0) {
    const filler = await fetchSimilarListFillerScholarships(
      supabase,
      [similarToId, ...out.map((x) => x.id)],
      need
    );
    for (const s of filler) {
      if (out.length >= limit) break;
      out.push(s);
    }
  }

  let expiredAdded = 0;
  for (const s of closedFromCategory) {
    if (out.length >= limit) break;
    if (expiredAdded >= SIMILAR_LIST_MAX_EXPIRED) break;
    out.push(s);
    expiredAdded += 1;
  }

  return out;
}

export async function executeScholarshipListQuery(
  supabase: ServerSupabaseClient,
  req: ScholarshipListRequest,
  opts: ScholarshipListQueryOpts
): Promise<ScholarshipListResult> {
  /**
   * Catalog “similar scholarships” must bypass personalized match ordering.
   * Otherwise `similar_to` is ignored whenever a match bundle exists.
   */
  if (req.similarToId) {
    let qCount = listingFrom(supabase)
      .select('id', {
        count: 'exact',
        head: true
      })
      .eq('is_active', true)
      .neq('id', req.similarToId);
    if (req.similarCategorySlug) {
      const raw = req.similarCategorySlug.trim().toLowerCase();
      const canon = normalizeCategoryId(raw);
      const keys = Array.from(
        new Set([raw].concat(canon ? [canon] : []))
      );
      qCount = applyCategoryOrFilter(qCount, keys);
    }
    if (opts.countOnly) {
      const { error, count } = await qCount;
      if (error) throw new Error(postgrestErrorToMessage(error));
      return {
        scholarships: [],
        total: count ?? 0,
        page: 1,
        limit: req.limit
      };
    }

    let rows =
      (await fetchScoredSimilarScholarshipRows(supabase, req)) ?? [];
    if (rows.length === 0) {
      rows = await loadSimilarScholarshipsLegacyRows(supabase, req);
    }

    const fromScored = rows.map((r) => mapScholarshipRow(r));
    const scholarships = await finalizeSimilarScholarshipsList(
      supabase,
      fromScored,
      req.similarToId,
      req.limit
    );
    return {
      scholarships,
      total: scholarships.length,
      page: 1,
      limit: req.limit
    };
  }

  let rEff = effectiveListingRequest(req);

  let bounds: ScholarshipListMeta['filterBounds'] | undefined;
  if (opts.includeMeta) {
    bounds = await fetchGlobalFilterBounds(supabase);
  }

  if (opts.countOnly) {
    let q: any = buildScholarshipListFilterQuery(supabase, true, rEff);
    let { error, count } = await q;
    if (error) throw new Error(postgrestErrorToMessage(error));
    if ((count ?? 0) === 0 && bestRecommendationHasRelaxableHardFilters(rEff)) {
      rEff = effectiveListingRequest(relaxBestRecommendationHardFilters(rEff));
      q = buildScholarshipListFilterQuery(supabase, true, rEff);
      const retry = await q;
      if (retry.error) throw new Error(postgrestErrorToMessage(retry.error));
      count = retry.count;
    }
    return {
      scholarships: [],
      total: count ?? 0,
      page: req.page,
      limit: req.limit
    };
  }

  const personalizedHubTab =
    (req.tab === 'best-recommendation' || req.tab === 'recommended') &&
    Boolean(req.personalizedProfile) &&
    !req.similarToId;

  if (personalizedHubTab && req.personalizedProfile) {
    let personalizedReq =
      req.tab === 'best-recommendation'
        ? bestRecommendationRequest(
            req,
            bounds ?? (await fetchGlobalFilterBounds(supabase))
          )
        : req;
    let personalizedEff = effectiveListingRequest(personalizedReq);
    let qc: any = buildScholarshipListFilterQuery(
      supabase,
      true,
      personalizedEff
    );
    let { error: cErr, count } = await qc;
    if (cErr) throw new Error(postgrestErrorToMessage(cErr));
    let rawTotal = count ?? 0;
    if (rawTotal === 0 && bestRecommendationHasRelaxableHardFilters(personalizedReq)) {
      personalizedReq = relaxBestRecommendationHardFilters(personalizedReq);
      personalizedEff = effectiveListingRequest(personalizedReq);
      qc = buildScholarshipListFilterQuery(supabase, true, personalizedEff);
      const retry = await qc;
      if (retry.error) throw new Error(postgrestErrorToMessage(retry.error));
      rawTotal = retry.count ?? 0;
    }

    let meta: ScholarshipListMeta | undefined;
    if (opts.includeMeta && bounds) {
      meta = await fetchScholarshipListMeta(supabase, personalizedReq, bounds, {
        includeCategoryCounts: opts.includeCategoryCounts,
        bestRecommendationCountOverride:
          personalizedReq.tab === 'best-recommendation' ? rawTotal : undefined
      });
    }

    const globalMaxPage = Math.max(1, Math.ceil(rawTotal / req.limit) || 1);
    let effectivePage = Math.min(Math.max(1, req.page), globalMaxPage);

    const cap = Math.min(PROFILE_SOFT_MATCH_SQL_WINDOW, rawTotal);
    const pagesRanked = Math.max(1, Math.ceil(cap / req.limit));
    let scholarships: Scholarship[];

    if (rawTotal > cap && effectivePage > pagesRanked) {
      const from = (effectivePage - 1) * req.limit;
      const to = from + req.limit - 1;
      let qn: any = buildScholarshipListFilterQuery(
        supabase,
        false,
        personalizedEff
      );
      qn = applySort(qn, personalizedEff.sort);
      const { data, error: dErr } = await qn.range(from, to);
      if (dErr) throw new Error(postgrestErrorToMessage(dErr));
      const rows = (data ?? []) as unknown as ScholarshipRow[];
      scholarships = applyDeadlineStateSafetyOrder(
        rows.map((r) => ({ ...mapScholarshipRow(r), profileMatchPercent: null }))
      );
    } else {
      const slicePage =
        rawTotal > cap ? Math.min(effectivePage, pagesRanked) : effectivePage;
      effectivePage = slicePage;

      if (cap === 0) {
        scholarships = [];
      } else {
        let qn: any = buildScholarshipListFilterQuery(
          supabase,
          false,
          personalizedEff
        );
        qn = applySort(qn, 'best_match');
        const { data, error: dErr } = await qn.range(0, cap - 1);
        if (dErr) throw new Error(postgrestErrorToMessage(dErr));
        const rows = (data ?? []) as unknown as ScholarshipRow[];
        const profile = req.personalizedProfile;
        const ranked = rows.map((r) => {
          const scholarship = mapScholarshipRow(r);
          return {
            scholarship,
            pct: computeHubProfileMatchPercent(scholarship, profile)
          };
        });
        ranked.sort((a, b) => {
          const deadlineStateOrder = compareDeadlineStateSafetyOrder(
            a.scholarship,
            b.scholarship
          );
          if (deadlineStateOrder !== 0) {
            return deadlineStateOrder;
          }
          const amountA = a.scholarship.awardAmountNumericSort ?? 0;
          const amountB = b.scholarship.awardAmountNumericSort ?? 0;
          const reqA =
            a.scholarship.requirementSignalsCount ??
            a.scholarship.requirementsCount ??
            Number.MAX_SAFE_INTEGER;
          const reqB =
            b.scholarship.requirementSignalsCount ??
            b.scholarship.requirementsCount ??
            Number.MAX_SAFE_INTEGER;
          const applicantsA =
            a.scholarship.applicantCount ?? Number.MAX_SAFE_INTEGER;
          const applicantsB =
            b.scholarship.applicantCount ?? Number.MAX_SAFE_INTEGER;
          const updatedA = a.scholarship.updatedAt
            ? Date.parse(a.scholarship.updatedAt)
            : 0;
          const updatedB = b.scholarship.updatedAt
            ? Date.parse(b.scholarship.updatedAt)
            : 0;
          const daysA =
            a.scholarship.daysUntilDeadline == null ||
            Number.isNaN(a.scholarship.daysUntilDeadline)
              ? Number.POSITIVE_INFINITY
              : a.scholarship.daysUntilDeadline;
          const daysB =
            b.scholarship.daysUntilDeadline == null ||
            Number.isNaN(b.scholarship.daysUntilDeadline)
              ? Number.POSITIVE_INFINITY
              : b.scholarship.daysUntilDeadline;
          const deadlineA = scholarshipDeadlineSortMs(
            a.scholarship.deadlineAt,
            a.scholarship.deadline
          );
          const deadlineB = scholarshipDeadlineSortMs(
            b.scholarship.deadlineAt,
            b.scholarship.deadline
          );
          const verifiedA = a.scholarship.verified ? 1 : 0;
          const verifiedB = b.scholarship.verified ? 1 : 0;

          switch (personalizedEff.sort) {
            case 'highest_amount':
              if (amountB !== amountA) return amountB - amountA;
              break;
            case 'most_recent':
              if (updatedB !== updatedA) return updatedB - updatedA;
              break;
            case 'closest_deadline':
              if (deadlineA !== deadlineB) return deadlineA - deadlineB;
              if (daysA !== daysB) return daysA - daysB;
              break;
            case 'verified_first':
              if (verifiedB !== verifiedA) return verifiedB - verifiedA;
              break;
            case 'least_requirements':
              if (reqA !== reqB) return reqA - reqB;
              break;
            case 'fewest_applicants':
              if (applicantsA !== applicantsB) return applicantsA - applicantsB;
              break;
            case 'magic':
            case 'best_match':
            case 'best_recommendation':
            case 'lowest_amount':
            default:
              if (b.pct !== a.pct) return b.pct - a.pct;
              break;
          }
          // For non-recommended sorts, match percent is a tie-breaker only.
          if (b.pct !== a.pct) return b.pct - a.pct;
          const ra = a.scholarship.rankingScore ?? 0;
          const rb = b.scholarship.rankingScore ?? 0;
          if (rb !== ra) return rb - ra;
          return amountB - amountA;
        });
        const start = (slicePage - 1) * req.limit;
        scholarships = applyDeadlineStateSafetyOrder(
          ranked
          .slice(start, start + req.limit)
          .map(({ scholarship, pct }) => ({ ...scholarship, profileMatchPercent: pct }))
        );
      }
    }

    if (process.env.SCHOLARSHIPS_LIST_SYNC_DEBUG === '1') {
      // eslint-disable-next-line no-console -- opt-in listing vs sidebar diagnostics
      console.log('[scholarships-list-sync]', {
        tab: personalizedEff.tab,
        listScope: personalizedEff.listScope,
        personalizedRank: true,
        sqlTotal: rawTotal,
        listRowsReturned: scholarships.length,
        sidebarMatches: meta?.sidebarCounts.matches ?? null,
        page: effectivePage,
        limit: req.limit
      });
    }

    return {
      scholarships,
      total: rawTotal,
      page: effectivePage,
      limit: req.limit,
      meta
    };
  }

  const buildListPageQuery = (fromIdx: number, toIdx: number) => {
    let qn: any = buildScholarshipListFilterQuery(supabase, false, rEff);
    qn = applySort(qn, rEff.sort);
    return qn.range(fromIdx, toIdx);
  };

  let effectivePage = req.page;
  let from = (effectivePage - 1) * req.limit;
  let to = from + req.limit - 1;
  let { data, error, count } = await buildListPageQuery(from, to);
  if (error) throw new Error(postgrestErrorToMessage(error));
  let rawTotal = count ?? 0;
  if (rawTotal === 0 && bestRecommendationHasRelaxableHardFilters(rEff)) {
    rEff = effectiveListingRequest(relaxBestRecommendationHardFilters(rEff));
    effectivePage = 1;
    from = 0;
    to = req.limit - 1;
    const retry = await buildListPageQuery(from, to);
    if (retry.error) throw new Error(postgrestErrorToMessage(retry.error));
    data = retry.data;
    count = retry.count;
    rawTotal = count ?? 0;
  }
  const sqlTotalBeforePostProcessing = rawTotal;

  let total = rawTotal;
  let rows = (data ?? []) as unknown as ScholarshipRow[];

  /** `page` past last page: empty `data` but `count` &gt; 0 — listing UI showed no cards. */
  const maxPage = Math.max(1, Math.ceil(total / req.limit) || 1);
  if (rows.length === 0 && total > 0 && req.page > maxPage) {
    effectivePage = maxPage;
    from = (effectivePage - 1) * req.limit;
    to = from + req.limit - 1;
    const r2 = await buildListPageQuery(from, to);
    if (r2.error) throw new Error(postgrestErrorToMessage(r2.error));
    rows = (r2.data ?? []) as unknown as ScholarshipRow[];
  }

  let meta: ScholarshipListMeta | undefined;
  if (opts.includeMeta && bounds) {
    meta = await fetchScholarshipListMeta(supabase, req, bounds, {
      includeCategoryCounts: opts.includeCategoryCounts,
      easyApplyCountOverride: canReuseEasyApplyTotalForSidebar(req) ? rawTotal : undefined,
      matchesCountOverride: canReuseMatchesTotalForSidebar(req) ? rawTotal : undefined
    });
  }

  const scholarships = applyDeadlineStateSafetyOrder(
    rows.map((r) => mapScholarshipRow(r))
  );

  if (process.env.SCHOLARSHIPS_LIST_SYNC_DEBUG === '1') {
    // eslint-disable-next-line no-console -- opt-in listing vs sidebar diagnostics
    console.log('[scholarships-list-sync]', {
      tab: rEff.tab,
      listScope: rEff.listScope,
      ignoredCount: rEff.ignored.length,
      sqlTotal: sqlTotalBeforePostProcessing,
      listTotal: total,
      listRowsReturned: scholarships.length,
      sidebarMatches: meta?.sidebarCounts.matches ?? null,
      page: effectivePage,
      limit: req.limit
    });
  }

  return {
    scholarships,
    total,
    page: effectivePage,
    limit: req.limit,
    meta
  };
}

async function countFor(
  supabase: ServerSupabaseClient,
  req: ScholarshipListRequest,
  tab: ScholarshipListTabId,
  countLabel?: string
): Promise<number> {
  return countScholarshipsForTabRequest(
    supabase,
    req,
    tab,
    countLabel ? { countLabel } : undefined
  );
}

function bestRecommendationRequest(
  req: ScholarshipListRequest,
  bounds: ScholarshipListMeta['filterBounds']
): ScholarshipListRequest {
  const moreFilters = mergeBestRecommendationFiltersFromProfile(
    'best-recommendation',
    cloneMoreFilters(req.moreFilters),
    buildScholarshipProfileFilterSeed(req.personalizedProfile ?? null),
    bounds
  );
  if (
    req.moreFilters.includeGpaBuckets.size === 0 &&
    buildBestRecommendationProfileGpaOrParts(req.personalizedProfile ?? null).length > 0
  ) {
    moreFilters.includeGpaBuckets = new Set();
  }
  return {
    ...req,
    tab: 'best-recommendation',
    moreFilters
  };
}

function easyApplyListCanonicalRequest(
  req: ScholarshipListRequest
): ScholarshipListRequest {
  const moreFilters = cloneMoreFilters(req.moreFilters);
  moreFilters.includeEasyApply.add('no_essay');
  moreFilters.includeEasyApply.add('easy_apply');
  moreFilters.includeEasyApply.add('quick_apply');
  return {
    ...req,
    moreFilters
  };
}

function hotDeadlinesListCanonicalRequest(
  req: ScholarshipListRequest
): ScholarshipListRequest {
  const moreFilters = cloneMoreFilters(req.moreFilters);
  moreFilters.deadlinePreset = 'any';
  return {
    ...req,
    deadline: 'any',
    moreFilters
  };
}

/** Sidebar “International Friendly” count: Matches scope + international citizenship filter. */
function internationalFriendlySidebarCountRequest(
  req: ScholarshipListRequest
): ScholarshipListRequest {
  const moreFilters = cloneMoreFilters(req.moreFilters);
  moreFilters.citizenshipAudience = 'international_friendly';
  return {
    ...req,
    tab: 'matches',
    moreFilters
  };
}

/**
 * Sidebar row totals (Matches, Hot Deadlines, Easy apply, …) must ignore the live
 * International Friendly citizenship toggle — same independence as switching tabs.
 * Otherwise `matches` and `internationalFriendly` both count the narrowed set.
 */
function sidebarCountsIgnoreCitizenshipAudience(
  req: ScholarshipListRequest
): ScholarshipListRequest {
  const moreFilters = cloneMoreFilters(req.moreFilters);
  moreFilters.citizenshipAudience = 'any';
  return { ...req, moreFilters };
}

function sidebarCatalogTabCountsBasisReq(
  req: ScholarshipListRequest
): ScholarshipListRequest {
  if (!req.personalizedProfile) {
    return req;
  }
  return {
    ...req,
    moreFilters: stripHubProfileHardMatchMoreFilters(req.moreFilters)
  };
}

function canReuseMatchesTotalForSidebar(req: ScholarshipListRequest): boolean {
  if (req.tab !== 'matches') return false;
  if (!req.personalizedProfile) return true;
  const stripped = stripHubProfileHardMatchMoreFilters(req.moreFilters);
  return JSON.stringify(moreFiltersToJson(req.moreFilters)) === JSON.stringify(moreFiltersToJson(stripped));
}

function canReuseEasyApplyTotalForSidebar(req: ScholarshipListRequest): boolean {
  return req.tab === 'easy-apply' && req.moreFilters.citizenshipAudience === 'any';
}

/** Align `moreFilters` / URL deadline with tab-only SQL (easy-apply, hot-deadlines). */
function normalizeTabScopedMoreFilters(
  req: ScholarshipListRequest
): ScholarshipListRequest {
  if (req.tab === 'easy-apply') return easyApplyListCanonicalRequest(req);
  if (req.tab === 'hot-deadlines') return hotDeadlinesListCanonicalRequest(req);
  return req;
}

/**
 * Sidebar “Saved Filters” (`recommended`) count: optional snapshot (hub) vs legacy `moreFilters`.
 */
export function moreFiltersForRecommendedSidebarCount(
  req: ScholarshipListRequest,
  _bounds: ScholarshipListMeta['filterBounds']
): MoreFiltersState | null {
  if (req.savedFiltersSnapshot === undefined) {
    return cloneMoreFilters(req.moreFilters);
  }
  if (req.savedFiltersSnapshot === null) {
    return null;
  }
  return cloneMoreFilters(req.savedFiltersSnapshot);
}

/**
 * Stable sidebar counts source of truth.
 * Intentionally decoupled from active list tab/page/sort/list total.
 */
export async function fetchScholarshipSidebarCounts(
  supabase: ServerSupabaseClient,
  req: ScholarshipListRequest,
  bounds: ScholarshipListMeta['filterBounds'],
  opts?: Pick<
    ScholarshipListMetaOpts,
    | 'bestRecommendationCountOverride'
    | 'easyApplyCountOverride'
    | 'matchesCountOverride'
    | 'skipBestRecommendationSidebarCount'
    | 'skipGuestZeroedSidebarCounts'
  >
): Promise<ScholarshipSidebarCounts> {
  const effectiveReq = sidebarGlobalCountsBasisRequest(req, bounds);
  /** Basis for every tab count except the dedicated International Friendly pill. */
  const countsBasisReq = sidebarCountsIgnoreCitizenshipAudience(effectiveReq);
  /** Matches / easy / hot / IF: drop profile-fit dimensions so counts ≠ Best pool. */
  const catalogSidebarBasisReq =
    sidebarCatalogTabCountsBasisReq(countsBasisReq);
  const tabs: ScholarshipListTabId[] = [
    'best-recommendation',
    'recommended',
    'easy-apply',
    'hot-deadlines',
    'matches',
    'saved',
    'started',
    'submitted',
    'ignored'
  ];
  const internationalFriendlyCountPromise = countScholarshipsForTabRequest(
    supabase,
    internationalFriendlySidebarCountRequest(catalogSidebarBasisReq),
    'matches',
    { countLabel: 'international-friendly' }
  )
    .then((n) => ({ ok: true as const, n }))
    .catch((e) => ({ ok: false as const, e }));
  const tabSettled = await Promise.allSettled(
    tabs.map(async (t) => {
      if (t === 'recommended') {
        const mf = moreFiltersForRecommendedSidebarCount(countsBasisReq, bounds);
        if (mf === null) {
          return { t, n: 0 };
        }
        const r = { ...countsBasisReq, moreFilters: mf };
        return { t, n: await countFor(supabase, r, 'recommended') };
      }
      if (t === 'easy-apply') {
        if (typeof opts?.easyApplyCountOverride === 'number') {
          return { t, n: opts.easyApplyCountOverride };
        }
        return {
          t,
          n: await countFor(
            supabase,
            easyApplyListCanonicalRequest(catalogSidebarBasisReq),
            t,
            'easy-apply'
          )
        };
      }
      if (t === 'hot-deadlines') {
        return {
          t,
          n: await countFor(
            supabase,
            hotDeadlinesListCanonicalRequest(catalogSidebarBasisReq),
            t
          )
        };
      }
      if (t === 'best-recommendation') {
        if (typeof opts?.bestRecommendationCountOverride === 'number') {
          return {
            t,
            n: opts.bestRecommendationCountOverride
          };
        }
        if (opts?.skipBestRecommendationSidebarCount) {
          return { t, n: 0 };
        }
        return {
          t,
          n: await countFor(
            supabase,
            bestRecommendationRequest(effectiveReq, bounds),
            t
          )
        };
      }
      if (
        opts?.skipGuestZeroedSidebarCounts &&
        (t === 'saved' ||
          t === 'ignored' ||
          t === 'started' ||
          t === 'submitted')
      ) {
        return { t, n: 0 };
      }
      if (t === 'matches' && typeof opts?.matchesCountOverride === 'number') {
        return { t, n: opts.matchesCountOverride };
      }
      const rowReq = t === 'matches' ? catalogSidebarBasisReq : countsBasisReq;
      return {
        t,
        n: await countFor(supabase, rowReq, t)
      };
    })
  );
  const internationalFriendlyResult = await internationalFriendlyCountPromise;
  const sidebarParts = tabSettled.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    const t = tabs[i]!;
    // eslint-disable-next-line no-console -- sidebar count diagnostics (avoid blank RSC errors)
    console.warn(
      '[fetchScholarshipSidebarCounts] tab count failed',
      t,
      postgrestErrorToMessage(result.reason)
    );
    return { t, n: 0 };
  });

  let internationalFriendly = 0;
  if (internationalFriendlyResult.ok) {
    internationalFriendly = internationalFriendlyResult.n;
  } else {
    // eslint-disable-next-line no-console -- sidebar count diagnostics
    console.warn(
      '[fetchScholarshipSidebarCounts] internationalFriendly count failed',
      postgrestErrorToMessage(internationalFriendlyResult.e)
    );
  }
  const sidebarCounts: ScholarshipSidebarCounts = {
    bestRecommendation: 0,
    recommended: 0,
    easyApply: 0,
    hotDeadlines: 0,
    internationalFriendly,
    matches: 0,
    saved: 0,
    started: 0,
    submitted: 0,
    ignored: 0
  };
  for (const { t, n } of sidebarParts) {
    if (t === 'best-recommendation') sidebarCounts.bestRecommendation = n;
    if (t === 'recommended') sidebarCounts.recommended = n;
    if (t === 'easy-apply') sidebarCounts.easyApply = n;
    if (t === 'hot-deadlines') sidebarCounts.hotDeadlines = n;
    if (t === 'matches') sidebarCounts.matches = n;
    if (t === 'saved') sidebarCounts.saved = n;
    if (t === 'started') sidebarCounts.started = n;
    if (t === 'submitted') sidebarCounts.submitted = n;
    if (t === 'ignored') sidebarCounts.ignored = n;
  }
  return sidebarCounts;
}

async function countCategory(
  supabase: ServerSupabaseClient,
  req: ScholarshipListRequest,
  catId: ScholarshipCategoryId
): Promise<number> {
  const scoped: ScholarshipListRequest = {
    ...req,
    categoryIds: new Set(),
    categoryPageSlug: null,
    catalogSubjectCategoryId: null
  };
  if (tabUsesEmptyIdSet(scoped, scoped.tab)) {
    return 0;
  }
  const eff = effectiveListingRequest(scoped);
  let q: any = buildScholarshipListFilterQuery(supabase, true, eff);
  q = applySelectedCategoriesFilter(q, new Set([catId]));
  const { error, count } = await q;
  if (error) throw new Error(postgrestErrorToMessage(error));
  return count ?? 0;
}

export function createDeferredScholarshipListMeta(
  req: ScholarshipListRequest,
  bounds: ScholarshipListMeta['filterBounds']
): ScholarshipListMeta {
  const categoryCounts = {} as Record<ScholarshipCategoryId, number>;
  for (const id of SCHOLARSHIP_CATEGORY_ORDER) categoryCounts[id] = 0;

  return {
    filterBounds: { ...bounds },
    sidebarCounts: { ...EMPTY_SCHOLARSHIP_SIDEBAR_COUNTS },
    categoryCounts,
    countryCounts: [],
    unspecifiedApplicantCountryCount: 0,
    personalizedMatchReady: Boolean(
      buildScholarshipProfileFilterSeed(req.personalizedProfile ?? null)
    ),
    deferredCounts: true
  };
}

/**
 * SEO listings: exact filters, then one deterministic relax chain (see `seoScholarshipFallback`).
 * Always use with `listScope: catalog` on the client so SQL applies long_tail + moreFilters.
 */
export async function executeScholarshipListQueryWithSeoFallback(
  supabase: ServerSupabaseClient,
  req: ScholarshipListRequest,
  opts: ScholarshipListQueryOpts,
  ctx: {
    enable: boolean;
    slugOnlyMoreFilters: MoreFiltersState | null;
    bounds: ScholarshipListMeta['filterBounds'];
    isCategorySeo: boolean;
  }
): Promise<ScholarshipListResult> {
  const thin = (n: number) => n < SEO_MIN_INDEXABLE_LIST_COUNT;

  const logFallbackCheck = (payload: {
    resultsLength: number;
    total: number;
    fallbackUsed: boolean;
  }) => {
    // eslint-disable-next-line no-console -- SEO fallback diagnostics
    console.log('FALLBACK CHECK', payload);
  };

  if (!ctx.enable) {
    const full = await executeScholarshipListQuery(supabase, req, opts);
    logFallbackCheck({
      resultsLength: full.scholarships.length,
      total: full.total,
      fallbackUsed: false
    });
    return {
      ...full,
      seoFallback: {
        used: false,
        tier: 0,
        exactTotal: full.total,
        thinListing: thin(full.total)
      }
    };
  }

  /** Count-only: no row array — gate fallback on total only. */
  if (opts.countOnly) {
    const exactCountRes = await executeScholarshipListQuery(supabase, req, {
      ...opts,
      countOnly: true
    });
    const exactTotal = exactCountRes.total;
    logFallbackCheck({
      resultsLength: 0,
      total: exactTotal,
      fallbackUsed: false
    });

    if (exactTotal > 0) {
      return {
        ...exactCountRes,
        seoFallback: {
          used: false,
          tier: 0,
          exactTotal,
          thinListing: thin(exactTotal)
        }
      };
    }

    const attempts = ctx.isCategorySeo
      ? buildCategorySeoRelaxAttempts(req, ctx.bounds)
      : buildLongTailSeoRelaxAttempts(req, ctx.bounds, ctx.slugOnlyMoreFilters);

    for (let i = 0; i < attempts.length; i++) {
      const tryReq = attempts[i]!;
      const tryCount = await executeScholarshipListQuery(supabase, tryReq, {
        ...opts,
        countOnly: true
      });
      if (tryCount.total > 0) {
        logFallbackCheck({
          resultsLength: 0,
          total: tryCount.total,
          fallbackUsed: true
        });
        return {
          ...tryCount,
          seoFallback: {
            used: true,
            tier: i + 1,
            exactTotal: 0,
            thinListing: thin(tryCount.total)
          }
        };
      }
    }

    let nuclear = buildSeoNuclearListingRequest(
      req,
      ctx.bounds,
      ctx.isCategorySeo
    );
    let full = await executeScholarshipListQuery(supabase, nuclear, {
      ...opts,
      countOnly: true
    });
    if (
      full.total === 0 &&
      !ctx.isCategorySeo &&
      seoRequestHasCatalogStateGeo(req)
    ) {
      nuclear = buildSeoNuclearListingRequest(req, ctx.bounds, false, {
        dropGeo: true
      });
      full = await executeScholarshipListQuery(supabase, nuclear, {
        ...opts,
        countOnly: true
      });
    }
    if (full.total === 0 && ctx.isCategorySeo) {
      nuclear = buildSeoNuclearListingRequest(req, ctx.bounds, false);
      full = await executeScholarshipListQuery(supabase, nuclear, {
        ...opts,
        countOnly: true
      });
    }
    logFallbackCheck({
      resultsLength: 0,
      total: full.total,
      fallbackUsed: true
    });
    return {
      ...full,
      seoFallback: {
        used: true,
        tier: attempts.length + 1,
        exactTotal: 0,
        thinListing: thin(full.total)
      }
    };
  }

  /**
   * List response: must run fallback when the **current page** has zero rows.
   * Previously we short-circuited on `countOnly` total &gt; 0, which skipped relax/nuclear
   * when count and paged `data` disagreed (or other edge cases).
   */
  const exactFull = await executeScholarshipListQuery(supabase, req, opts);
  const exactRowsLen = exactFull.scholarships.length;
  const exactCatalogTotal = exactFull.total;

  logFallbackCheck({
    resultsLength: exactRowsLen,
    total: exactCatalogTotal,
    fallbackUsed: false
  });

  if (exactRowsLen > 0) {
    return {
      ...exactFull,
      seoFallback: {
        used: false,
        tier: 0,
        exactTotal: exactCatalogTotal,
        thinListing: thin(exactFull.total)
      }
    };
  }

  const attempts = ctx.isCategorySeo
    ? buildCategorySeoRelaxAttempts(req, ctx.bounds)
    : buildLongTailSeoRelaxAttempts(req, ctx.bounds, ctx.slugOnlyMoreFilters);

  for (let i = 0; i < attempts.length; i++) {
    const tryReq = attempts[i]!;
    const tryCount = await executeScholarshipListQuery(supabase, tryReq, {
      ...opts,
      countOnly: true
    });
    if (tryCount.total > 0) {
      const full = await executeScholarshipListQuery(supabase, tryReq, opts);
      if (full.scholarships.length === 0) {
        continue;
      }
      logFallbackCheck({
        resultsLength: full.scholarships.length,
        total: full.total,
        fallbackUsed: true
      });
      return {
        ...full,
        seoFallback: {
          used: true,
          tier: i + 1,
          exactTotal: exactCatalogTotal,
          thinListing: thin(full.total)
        }
      };
    }
  }

  let nuclear = buildSeoNuclearListingRequest(
    req,
    ctx.bounds,
    ctx.isCategorySeo
  );
  let full = await executeScholarshipListQuery(supabase, nuclear, opts);
  if (
    full.total === 0 &&
    !ctx.isCategorySeo &&
    seoRequestHasCatalogStateGeo(req)
  ) {
    nuclear = buildSeoNuclearListingRequest(req, ctx.bounds, false, {
      dropGeo: true
    });
    full = await executeScholarshipListQuery(supabase, nuclear, opts);
  }
  if (full.total === 0 && ctx.isCategorySeo) {
    nuclear = buildSeoNuclearListingRequest(req, ctx.bounds, false);
    full = await executeScholarshipListQuery(supabase, nuclear, opts);
  }
  logFallbackCheck({
    resultsLength: full.scholarships.length,
    total: full.total,
    fallbackUsed: true
  });
  return {
    ...full,
    seoFallback: {
      used: true,
      tier: attempts.length + 1,
      exactTotal: exactCatalogTotal,
      thinListing: thin(full.total)
    }
  };
}

export async function fetchScholarshipListMeta(
  supabase: ServerSupabaseClient,
  req: ScholarshipListRequest,
  bounds?: ScholarshipListMeta['filterBounds'],
  opts?: ScholarshipListMetaOpts
): Promise<ScholarshipListMeta> {
  const b = bounds ?? (await fetchGlobalFilterBounds(supabase));
  const includeCategoryCounts = opts?.includeCategoryCounts !== false;
  const effectiveReq = sidebarGlobalCountsBasisRequest(req, b);
  const cacheKey = `${buildListMetaCacheKey(effectiveReq, b, includeCategoryCounts, opts)}|catMc:v9`;
  const cached = readTtlValue(listMetaCache.get(cacheKey));
  if (cached) {
    return cloneScholarshipListMeta(cached);
  }

  const categoryReq = categoryDropdownCountsRequest(req, b);
  const sidebarCounts = await fetchScholarshipSidebarCounts(supabase, req, b, opts);

  const categoryCounts = {} as Record<ScholarshipCategoryId, number>;
  if (includeCategoryCounts) {
    const categoryParts = await Promise.allSettled(
      SCHOLARSHIP_CATEGORY_ORDER.map(async (id) => ({
        id,
        n: await countCategory(supabase, categoryReq, id)
      }))
    );
    categoryParts.forEach((part, index) => {
      const id = SCHOLARSHIP_CATEGORY_ORDER[index]!;
      if (part.status === 'fulfilled') {
        categoryCounts[id] = part.value.n;
        return;
      }
      // eslint-disable-next-line no-console -- keep list rendering even if one count query fails
      console.warn(
        '[fetchScholarshipListMeta] category count failed',
        id,
        postgrestErrorToMessage(part.reason)
      );
      categoryCounts[id] = 0;
    });
  } else {
    for (const id of SCHOLARSHIP_CATEGORY_ORDER) categoryCounts[id] = 0;
  }

  const { countryCounts, unspecifiedApplicantCountryCount } =
    await fetchApplicantCountryCounts(supabase);

  const meta: ScholarshipListMeta = {
    filterBounds: b,
    sidebarCounts,
    categoryCounts,
    countryCounts,
    unspecifiedApplicantCountryCount,
    personalizedMatchReady: Boolean(
      buildScholarshipProfileFilterSeed(req.personalizedProfile ?? null)
    )
  };
  writeTtlValue(listMetaCache, cacheKey, cloneScholarshipListMeta(meta), LIST_META_CACHE_TTL_MS);
  return meta;
}

/**
 * Cron/dispatch: same SQL filter stack as the hub tab, narrowed to one scholarship id.
 */
export async function scholarshipMatchesTabListSql(
  supabase: ServerSupabaseClient,
  req: ScholarshipListRequest,
  tab: ScholarshipListTabId,
  scholarshipId: string
): Promise<boolean> {
  if (tabUsesEmptyIdSet(req, tab)) return false;
  const r = { ...effectiveListingRequest({ ...req, tab }), tab };
  let q: any = buildScholarshipListFilterQuery(supabase, true, r);
  q = q.eq('id', scholarshipId);
  const { error, count } = await q;
  if (error) throw new Error(postgrestErrorToMessage(error));
  return (count ?? 0) > 0;
}

export { DEFAULT_LIMIT as SCHOLARSHIPS_API_DEFAULT_LIMIT, MAX_LIMIT as SCHOLARSHIPS_API_MAX_LIMIT };
