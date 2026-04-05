import type { EffectiveScholarshipFilters, ScholarshipsV2Mode } from '@/lib/scholarships-v2/types';

export function buildScholarshipsRequestKey(
  mode: ScholarshipsV2Mode,
  filters: EffectiveScholarshipFilters
): string {
  return JSON.stringify({ mode, filters });
}
