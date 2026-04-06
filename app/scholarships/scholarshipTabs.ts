import type { Scholarship } from './scholarshipsData';

export type ScholarshipSidebarCounts = {
  /** Personalized: SQL tab scope (high credibility / verified). */
  bestMatches: number;
  /** Personalized: SQL tab scope (verified or strong credibility). */
  recommended: number;
  easyApply: number;
  /** Personalized: profile-fit SQL base + ignored filter; catalog: same without profile OR. */
  matches: number;
  saved: number;
  started: number;
  submitted: number;
  ignored: number;
};

export const SCHOLARSHIP_LIST_TAB_IDS = [
  'best-matches',
  'recommended',
  'easy-apply',
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

const TAB_PARAM_VALUES = new Set<string>(SCHOLARSHIP_LIST_TAB_IDS);

/** Hidden from hub nav / URL UX; types and API paths for these tabs stay for later. */
const HUB_HIDDEN_TAB_IDS = new Set<ScholarshipListTabId>(['started', 'submitted']);

export function parseScholarshipTabParam(
  raw: string | null | undefined
): ScholarshipListTabId {
  if (!raw || !TAB_PARAM_VALUES.has(raw)) return DEFAULT_SCHOLARSHIP_TAB;
  return raw as ScholarshipListTabId;
}

/** Hub listing: same defaults as guest — catalog `matches` when `tab` is missing. */
export function parseHubScholarshipTabParam(
  raw: string | null | undefined
): ScholarshipListTabId {
  return parseHubScholarshipTabParamForGuest(raw);
}

/**
 * Hub for guests: default **All** (`matches`); explicit `tab` in URL is respected
 * (e.g. best-matches → empty state + CTA).
 */
export function parseHubScholarshipTabParamForGuest(
  raw: string | null | undefined
): ScholarshipListTabId {
  if (!raw || !TAB_PARAM_VALUES.has(raw)) return 'matches';
  const t = raw as ScholarshipListTabId;
  if (HUB_HIDDEN_TAB_IDS.has(t)) return 'matches';
  return t;
}

/** Hub / listing cards: primary actions (save, ignore, restore). No read-only tabs in this set. */
export function scholarshipTabShowsCardActions(tab: ScholarshipListTabId): boolean {
  if (HUB_HIDDEN_TAB_IDS.has(tab)) return false;
  return SCHOLARSHIP_LIST_TAB_IDS.includes(tab);
}

function credPercent(s: Scholarship): number | null {
  const lab = s.credibilityLabel?.trim();
  if (!lab) return null;
  const m = lab.match(/(\d+)\s*%/);
  if (m) return Number(m[1]);
  return null;
}

function isRecommendedScholarship(s: Scholarship): boolean {
  if (s.featured) return true;
  if (s.verified) return true;
  const p = credPercent(s);
  return p !== null && p >= 70;
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
    case 'best-matches':
      return usa.filter(
        (s) => !ign.has(s.id) && (s.aiMatchScore ?? 0) > 90
      );
    case 'matches':
      return usa.filter((s) => !ign.has(s.id));
    case 'saved':
      return usa.filter((s) => saved.has(s.id));
    case 'ignored':
      return usa.filter((s) => ign.has(s.id));
    case 'recommended':
      return usa.filter((s) => !ign.has(s.id) && isRecommendedScholarship(s));
    case 'easy-apply':
      return usa.filter(
        (s) => !ign.has(s.id) && (s.eligibility?.length ?? 0) === 0
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
    bestMatches: scholarshipsInTab(usa, 'best-matches', ids).length,
    recommended: scholarshipsInTab(usa, 'recommended', ids).length,
    easyApply: scholarshipsInTab(usa, 'easy-apply', ids).length,
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
    case 'best-matches':
      return guest ? 'Best matches' : 'Best matches for you';
    case 'saved':
      return 'Saved scholarships';
    case 'recommended':
      return guest ? 'Recommended' : 'Recommended scholarships';
    case 'easy-apply':
      return 'Easy apply scholarships';
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
  if (tab === 'best-matches') return 'Loading best matches…';
  return 'Loading matches…';
}
