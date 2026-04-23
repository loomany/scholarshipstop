import type { MoreFiltersState } from '@/app/scholarships/moreFilters';
import type {
  ScholarshipAudienceParam,
  ScholarshipListScope
} from '@/app/scholarships/scholarshipListUrl';
import type { ScholarshipListTabId } from '@/app/scholarships/scholarshipTabs';

/**
 * Where a saved filter preset is scoped in the My scholarships hub (sidebar row / context).
 * `matches-international-friendly` = Matches + International Friendly (URL `aud=international_friendly`).
 */
export const HUB_SAVED_FILTER_SCOPES = [
  'best-recommendation',
  'easy-apply',
  'hot-deadlines',
  'matches',
  'matches-international-friendly',
  'saved',
  'ignored'
] as const;

export type HubSavedFilterScope = (typeof HUB_SAVED_FILTER_SCOPES)[number];

const SCOPE_SET = new Set<string>(HUB_SAVED_FILTER_SCOPES);

export function isHubSavedFilterScope(
  s: string | null | undefined
): s is HubSavedFilterScope {
  return Boolean(s && SCOPE_SET.has(s));
}

/**
 * User-facing line for the save modal / toolbar hint.
 */
export function hubSaveSectionUserLabel(
  activeTab: ScholarshipListTabId,
  audience: ScholarshipAudienceParam
): string {
  if (activeTab === 'matches' && audience === 'international_friendly') {
    return 'International Friendly';
  }
  switch (activeTab) {
    case 'best-recommendation':
      return 'Best recommendation';
    case 'easy-apply':
      return 'Easy apply';
    case 'hot-deadlines':
      return 'Hot Deadlines';
    case 'matches':
      return 'Matches';
    case 'saved':
      return 'Saved';
    case 'ignored':
      return 'Ignored';
    case 'recommended':
    case 'from-email':
    case 'started':
    case 'submitted':
      return 'Matches';
    default:
      return 'Matches';
  }
}

export function hubScopeFromListContext(
  activeTab: ScholarshipListTabId,
  audience: ScholarshipAudienceParam
): HubSavedFilterScope {
  if (activeTab === 'matches' && audience === 'international_friendly') {
    return 'matches-international-friendly';
  }
  switch (activeTab) {
    case 'best-recommendation':
      return 'best-recommendation';
    case 'easy-apply':
      return 'easy-apply';
    case 'hot-deadlines':
      return 'hot-deadlines';
    case 'matches':
      return 'matches';
    case 'saved':
      return 'saved';
    case 'ignored':
      return 'ignored';
    case 'recommended':
    case 'from-email':
    case 'started':
    case 'submitted':
    default:
      return 'matches';
  }
}

/**
 * True if this preset should show as a chip in the list header for the current URL context.
 * Presets with no `hubScope` (legacy) show on catalog Matches, not on International Friendly.
 */
export function presetHubScopeMatchesListContext(
  hubScope: HubSavedFilterScope | undefined,
  activeTab: ScholarshipListTabId,
  audience: ScholarshipAudienceParam
): boolean {
  if (!hubScope) {
    return activeTab === 'matches' && audience === 'any';
  }
  if (hubScope === 'matches-international-friendly') {
    return activeTab === 'matches' && audience === 'international_friendly';
  }
  if (hubScope === 'matches') {
    return activeTab === 'matches' && audience === 'any';
  }
  const tabForScope: Record<Exclude<HubSavedFilterScope, 'matches' | 'matches-international-friendly'>, ScholarshipListTabId> = {
    'best-recommendation': 'best-recommendation',
    'easy-apply': 'easy-apply',
    'hot-deadlines': 'hot-deadlines',
    saved: 'saved',
    ignored: 'ignored'
  };
  const want = tabForScope[hubScope as keyof typeof tabForScope];
  return want != null && activeTab === want;
}

export function listingNavPatchForHubScope(
  hubScope: HubSavedFilterScope | undefined,
  state: MoreFiltersState
): {
  tab: string;
  deadline: MoreFiltersState['deadlinePreset'];
  audience: ScholarshipAudienceParam;
  scope: ScholarshipListScope;
} {
  const deadline = state.deadlinePreset;
  const rawAud = state.citizenshipAudience;
  const audience: ScholarshipAudienceParam =
    rawAud === 'international_friendly' ? 'international_friendly' : 'any';

  if (!hubScope) {
    return { tab: 'matches', deadline, audience, scope: 'catalog' };
  }
  if (hubScope === 'matches-international-friendly') {
    return {
      tab: 'matches',
      deadline,
      audience: 'international_friendly',
      scope: 'catalog'
    };
  }
  if (hubScope === 'matches') {
    return { tab: 'matches', deadline, audience, scope: 'catalog' };
  }
  if (hubScope === 'best-recommendation') {
    return { tab: 'best-recommendation', deadline, audience, scope: 'catalog' };
  }
  if (hubScope === 'easy-apply') {
    return { tab: 'easy-apply', deadline, audience, scope: 'catalog' };
  }
  if (hubScope === 'hot-deadlines') {
    return { tab: 'hot-deadlines', deadline, audience, scope: 'catalog' };
  }
  if (hubScope === 'saved') {
    return { tab: 'saved', deadline, audience, scope: 'catalog' };
  }
  if (hubScope === 'ignored') {
    return { tab: 'ignored', deadline, audience, scope: 'catalog' };
  }
  return { tab: 'matches', deadline, audience, scope: 'catalog' };
}
