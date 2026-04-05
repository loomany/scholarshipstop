import type { EffectiveScholarshipFilters, ScholarshipsV2Mode, UserCollectionTab } from '@/lib/scholarships-v2/types';

export function resolveScholarshipsMode(filters: EffectiveScholarshipFilters): ScholarshipsV2Mode {
  if (filters.userCollectionTab) return 'userCollections';
  return filters.mode;
}

export function resolveUserCollectionTab(
  filters: EffectiveScholarshipFilters,
  fallback: UserCollectionTab = 'saved'
): UserCollectionTab {
  return filters.userCollectionTab ?? fallback;
}
