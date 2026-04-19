import {
  cloneMoreFilters,
  defaultMoreFiltersFromBounds,
  type DeadlinePreset,
  type MoreFiltersState
} from '@/app/scholarships/moreFilters';
import type { ScholarshipListTabId } from '@/app/scholarships/scholarshipTabs';
import type { LongTailRouteScopePayload } from '@/app/scholarships/scholarshipListServerPayload';
import { moreFiltersFromJson } from '@/lib/scholarships/scholarshipListApiCodec';
import {
  mergeBestRecommendationFiltersFromProfile,
  type ScholarshipProfileFilterSeed
} from '@/lib/scholarships/profileFilterDefaults';
import { mergeMoreFilterStates } from '@/lib/scholarships/seoScholarshipListing';

type FilterBounds = {
  amountMin: number;
  amountMax: number;
  applicantsMin: number;
  applicantsMax: number;
};

/**
 * Canonical “My scholarships” preset for a hub tab: built-in filters only (profile, saved preset, tab scope).
 * Extra manual tweaks from the More filters panel are layered on top in client state until the tab changes.
 */
export function buildHubTabPresetMoreFilters(options: {
  tab: ScholarshipListTabId;
  filterBounds: FilterBounds;
  /** Deadline from the listing URL (`parseScholarshipListUrl`). */
  deadlineFromUrl: DeadlinePreset | null;
  routeScope: LongTailRouteScopePayload | null;
  profileFilterSeed: ScholarshipProfileFilterSeed | null | undefined;
  landingQuizProfileSeed: ScholarshipProfileFilterSeed | null;
  savedFiltersFromStorage: MoreFiltersState | null;
  isAuthenticated: boolean;
}): MoreFiltersState {
  let base = defaultMoreFiltersFromBounds(options.filterBounds);
  base.includeEasyApply.clear();
  const d = options.deadlineFromUrl;
  if (d && d !== 'any') {
    base.deadlinePreset = d;
  }
  if (options.routeScope?.baseMoreFilters) {
    base = mergeMoreFilterStates(
      moreFiltersFromJson(
        options.routeScope.baseMoreFilters,
        options.filterBounds
      ),
      base
    );
  }

  switch (options.tab) {
    case 'matches':
    case 'saved':
    case 'ignored':
    case 'started':
    case 'submitted':
      return cloneMoreFilters(base);
    case 'best-matches': {
      const seed =
        options.profileFilterSeed ??
        (!options.isAuthenticated ? options.landingQuizProfileSeed : null);
      if (seed) {
        return mergeBestRecommendationFiltersFromProfile(
          'best-matches',
          cloneMoreFilters(base),
          seed,
          options.filterBounds
        );
      }
      return cloneMoreFilters(base);
    }
    case 'recommended': {
      if (options.savedFiltersFromStorage) {
        const saved = cloneMoreFilters(options.savedFiltersFromStorage);
        if (options.routeScope?.baseMoreFilters) {
          return mergeMoreFilterStates(
            moreFiltersFromJson(
              options.routeScope.baseMoreFilters,
              options.filterBounds
            ),
            saved
          );
        }
        return saved;
      }
      return cloneMoreFilters(base);
    }
    case 'easy-apply':
    case 'hot-deadlines':
      return cloneMoreFilters(base);
    default:
      return cloneMoreFilters(base);
  }
}
