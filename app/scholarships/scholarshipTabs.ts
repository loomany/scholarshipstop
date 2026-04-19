import { matchesDeadlinePreset } from './moreFilters';
import type { Scholarship } from './scholarshipsData';

export type ScholarshipSidebarCounts = {
  /** Personalized: profile-narrowed Best recommendation pool. */
  bestRecommendation: number;
  /** Personalized: SQL tab scope (verified or strong credibility). */
  recommended: number;
  easyApply: number;
  /** Deadlines within ~7 days (`lt_1d` + `d1_7` buckets). */
  hotDeadlines: number;
  /**
   * Catalog “International Friendly” scope: same SQL as Matches for the current
   * filters, plus `citizenshipAudience === international_friendly` (sidebar row).
   */
  internationalFriendly: number;
  /** Personalized: profile-fit SQL base + ignored filter; catalog: same without profile OR. */
  matches: number;
  saved: number;
  started: number;
  submitted: number;
  ignored: number;
};

export const SCHOLARSHIP_LIST_TAB_IDS = [
  'best-recommendation',
  'recommended',
  'easy-apply',
  'hot-deadlines',
  'matches',
  'saved',
  'started',
  'submitted',
  'ignored'
] as const;

export type ScholarshipListTabId = (typeof SCHOLARSHIP_LIST_TAB_IDS)[number];

export const DEFAULT_SCHOLARSHIP_TAB: ScholarshipListTabId = 'matches';

/** Hub `/scholarships` default when `tab` is absent (catalog browse). */
export const HUB_DEFAULT_SCHOLARSHIP_TAB: ScholarshipListTabId = 'matches';
export const LEGACY_BEST_RECOMMENDATION_TAB_ID = 'best-matches';

const TAB_PARAM_VALUES = new Set<string>(SCHOLARSHIP_LIST_TAB_IDS);

/** Hidden from hub nav / URL UX; types and API paths for these tabs stay for later. */
const HUB_HIDDEN_TAB_IDS = new Set<ScholarshipListTabId>(['started', 'submitted']);

export function parseScholarshipTabParam(
  raw: string | null | undefined
): ScholarshipListTabId {
  const normalized =
    raw === LEGACY_BEST_RECOMMENDATION_TAB_ID ? 'best-recommendation' : raw;
  if (!normalized || !TAB_PARAM_VALUES.has(normalized)) {
    return DEFAULT_SCHOLARSHIP_TAB;
  }
  return normalized as ScholarshipListTabId;
}

/** Hub listing: same defaults as guest — catalog `matches` when `tab` is missing. */
export function parseHubScholarshipTabParam(
  raw: string | null | undefined
): ScholarshipListTabId {
  return parseHubScholarshipTabParamForGuest(raw);
}

/**
 * Hub for guests: default **All** (`matches`); explicit `tab` in URL is respected
 * (e.g. `best-recommendation` for landing quiz / Best recommendation).
 */
export function parseHubScholarshipTabParamForGuest(
  raw: string | null | undefined
): ScholarshipListTabId {
  const t = parseScholarshipTabParam(raw);
  if (HUB_HIDDEN_TAB_IDS.has(t)) return 'matches';
  return t;
}

/** Hub / listing cards: primary actions (save, ignore, restore). No read-only tabs in this set. */
export function scholarshipTabShowsCardActions(tab: ScholarshipListTabId): boolean {
  if (HUB_HIDDEN_TAB_IDS.has(tab)) return false;
  return SCHOLARSHIP_LIST_TAB_IDS.includes(tab);
}

/** Static fallback only: high-credibility rows when API data is unavailable. */
function isBestRecommendationTabScholarship(s: Scholarship): boolean {
  if (s.verified) return true;
  const c = s.credibilityScore;
  return c != null && Number.isFinite(c) && c >= 90;
}

export type TabIdSets = {
  saved: string[];
  ignored: string[];
  started: string[];
  submitted: string[];
};

export function scholarshipsInTab(
  usa: Scholarship[],
  tab: ScholarshipListTabId,
  ids: TabIdSets
): Scholarship[] {
  const ign = new Set(ids.ignored);
  const saved = new Set(ids.saved);
  const started = new Set(ids.started);
  const submitted = new Set(ids.submitted);

  switch (tab) {
    case 'best-recommendation':
      return usa.filter(
        (s) => !ign.has(s.id) && isBestRecommendationTabScholarship(s)
      );
    case 'matches':
      return usa.filter((s) => !ign.has(s.id));
    case 'saved':
      return usa.filter((s) => saved.has(s.id));
    case 'ignored':
      return usa.filter((s) => ign.has(s.id));
    case 'recommended':
      /** Hub uses API for this tab; static catalog fallback mirrors Matches scope. */
      return usa.filter((s) => !ign.has(s.id));
    case 'easy-apply':
      return usa.filter(
        (s) => !ign.has(s.id) && (s.eligibility?.length ?? 0) === 0
      );
    case 'hot-deadlines':
      return usa.filter(
        (s) =>
          !ign.has(s.id) &&
          (matchesDeadlinePreset(s, 'lt1d') || matchesDeadlinePreset(s, 'd1_7'))
      );
    case 'started':
      return usa.filter((s) => started.has(s.id));
    case 'submitted':
      return usa.filter((s) => submitted.has(s.id));
    default:
      return usa.filter((s) => !ign.has(s.id));
  }
}

export function computeScholarshipSidebarCounts(
  usa: Scholarship[],
  ids: TabIdSets
): ScholarshipSidebarCounts {
  return {
    bestRecommendation: scholarshipsInTab(usa, 'best-recommendation', ids).length,
    recommended: scholarshipsInTab(usa, 'recommended', ids).length,
    easyApply: scholarshipsInTab(usa, 'easy-apply', ids).length,
    hotDeadlines: scholarshipsInTab(usa, 'hot-deadlines', ids).length,
    internationalFriendly: 0,
    matches: scholarshipsInTab(usa, 'matches', ids).length,
    saved: scholarshipsInTab(usa, 'saved', ids).length,
    started: scholarshipsInTab(usa, 'started', ids).length,
    submitted: scholarshipsInTab(usa, 'submitted', ids).length,
    ignored: scholarshipsInTab(usa, 'ignored', ids).length
  };
}

export function matchesFeaturedBadgeCount(
  usa: Scholarship[],
  ids: TabIdSets
): string | null {
  const n = scholarshipsInTab(usa, 'matches', ids).filter((s) => s.featured)
    .length;
  return n > 0 ? String(n) : null;
}

export function scholarshipListPageTitle(
  tab: ScholarshipListTabId,
  options?: { guest?: boolean }
): string {
  const guest = options?.guest === true;
  switch (tab) {
    case 'best-recommendation':
      return guest ? 'Best recommendations' : 'Best recommendations for you';
    case 'saved':
      return 'Saved scholarships';
    case 'recommended':
      return guest ? 'Saved filters' : 'Saved filters';
    case 'easy-apply':
      return 'Easy apply scholarships';
    case 'hot-deadlines':
      return 'Hot deadlines';
    case 'started':
      return 'Started applications';
    case 'submitted':
      return 'Submitted applications';
    case 'ignored':
      return 'Ignored scholarships';
    case 'matches':
    default:
      return guest ? 'Browse scholarships' : 'Scholarship matches';
  }
}

export function scholarshipListLoadingText(tab: ScholarshipListTabId): string {
  if (tab === 'saved') return 'Loading saved…';
  if (tab === 'best-recommendation') return 'Loading best recommendations…';
  if (tab === 'recommended') return 'Loading saved filters…';
  if (tab === 'hot-deadlines') return 'Loading hot deadlines…';
  return 'Loading matches…';
}
