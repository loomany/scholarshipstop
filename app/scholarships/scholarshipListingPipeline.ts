/**
 * Единый pipeline каталога: base по вкладке → search → categories → more filters → sort.
 * Sidebar counts считаются отдельно (глобально), см. computeScholarshipSidebarCounts.
 */

import {
  countScholarshipsByCategory,
  scholarshipMatchesCategoryFilter,
  type ScholarshipCategoryId
} from './scholarshipCategories';
import type { Scholarship } from './scholarshipsData';
import {
  scholarshipPassesMoreFilters,
  type MoreFiltersState
} from './moreFilters';
import {
  sortScholarshipsInPlace,
  type SortOption
} from './scholarshipSort';
import {
  scholarshipsInTab,
  type ScholarshipListTabId,
  type TabIdSets
} from './scholarshipTabs';

export type ScholarshipListingPipelineResult = {
  /** Данные вкладки без search/category/more/sort (источник для category counts и filter bounds). */
  baseForTab: Scholarship[];
  /** После search + category; для preview в More filters. */
  afterSearchAndCategory: Scholarship[];
  /** Финальный отсортированный список до пагинации. */
  sortedFiltered: Scholarship[];
};

/**
 * Порядок: base → search (title) → category filter → more filters → sort.
 * Используется каталогом по вкладкам и страницей `/scholarships/category/[slug]`.
 */
export function deriveScholarshipListingFromBase(
  baseForTab: Scholarship[],
  query: string,
  appliedCategoryIds: Set<ScholarshipCategoryId>,
  moreFiltersApplied: MoreFiltersState | null,
  sortBy: SortOption,
  scholarshipOrderIndex: Map<string, number>
): ScholarshipListingPipelineResult {
  const q = query.trim().toLowerCase();
  const afterSearch =
    q.length === 0
      ? baseForTab
      : baseForTab.filter((s) => s.title.toLowerCase().includes(q));

  const afterSearchAndCategory = afterSearch.filter((s) =>
    scholarshipMatchesCategoryFilter(s.categories, appliedCategoryIds)
  );

  let filtered = afterSearchAndCategory;
  if (moreFiltersApplied) {
    filtered = filtered.filter((s) =>
      scholarshipPassesMoreFilters(s, moreFiltersApplied)
    );
  }

  const sortedFiltered = [...filtered];
  sortScholarshipsInPlace(sortedFiltered, sortBy, scholarshipOrderIndex);

  return {
    baseForTab,
    afterSearchAndCategory,
    sortedFiltered
  };
}

/**
 * Порядок: base(tab) → search (title) → category filter → more filters → sort.
 */
export function deriveScholarshipListing(
  usaScholarships: Scholarship[],
  activeTab: ScholarshipListTabId,
  tabIdSets: TabIdSets,
  query: string,
  appliedCategoryIds: Set<ScholarshipCategoryId>,
  moreFiltersApplied: MoreFiltersState | null,
  sortBy: SortOption,
  scholarshipOrderIndex: Map<string, number>
): ScholarshipListingPipelineResult {
  const baseForTab = scholarshipsInTab(
    usaScholarships,
    activeTab,
    tabIdSets
  );
  return deriveScholarshipListingFromBase(
    baseForTab,
    query,
    appliedCategoryIds,
    moreFiltersApplied,
    sortBy,
    scholarshipOrderIndex
  );
}

/** Counts категорий строго по base dataset текущей вкладки. */
export function categoryCountsForListingBase(
  baseForTab: Scholarship[]
): Record<ScholarshipCategoryId, number> {
  return countScholarshipsByCategory(baseForTab);
}
