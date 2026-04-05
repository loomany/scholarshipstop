import type { MoreFiltersJson } from '@/lib/scholarships/scholarshipListApiCodec';
import { buildEffectiveScholarshipFilters } from '@/lib/scholarships-v2/filters/effective';
import { adaptLegacyMoreFiltersToV2 } from '@/lib/scholarships-v2/adapters/fromLegacyMoreFilters';
import { adaptLegacySearchParamsToV2 } from '@/lib/scholarships-v2/adapters/fromLegacySearchParams';
import type { EffectiveScholarshipFilters, ScholarshipFilterInput } from '@/lib/scholarships-v2/types';

export function buildV2FiltersFromLegacyInput(input: {
  searchParams: URLSearchParams;
  moreFilters?: MoreFiltersJson | null;
  useDraftFilters?: boolean;
  publicDefaults?: Partial<ScholarshipFilterInput>;
  profileDefaults?: Partial<ScholarshipFilterInput>;
}): EffectiveScholarshipFilters {
  const fromSearch = adaptLegacySearchParamsToV2(input.searchParams);
  const fromMoreFilters = adaptLegacyMoreFiltersToV2(input.moreFilters);

  return buildEffectiveScholarshipFilters({
    mode: fromSearch.mode,
    page: fromSearch.page,
    pageSize: fromSearch.pageSize,
    sort: fromSearch.sort,
    publicDefaults: input.publicDefaults,
    profileDefaults: input.profileDefaults,
    explicitUrlFilters: fromSearch.filters,
    modalFilters: {
      applied: fromMoreFilters,
      draft: fromMoreFilters
    },
    useDraftFilters: input.useDraftFilters
  });
}
