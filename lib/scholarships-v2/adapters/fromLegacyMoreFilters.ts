import type { MoreFiltersJson } from '@/lib/scholarships/scholarshipListApiCodec';
import type { ScholarshipFilterInput } from '@/lib/scholarships-v2/types';

export function adaptLegacyMoreFiltersToV2(
  moreFilters: MoreFiltersJson | null | undefined
): Partial<ScholarshipFilterInput> {
  if (!moreFilters) return {};

  return {
    deadlinePreset: moreFilters.deadlinePreset,
    minAmount: moreFilters.amountMin,
    maxAmount: moreFilters.amountMax,
    applicantsMin: moreFilters.applicantsMin,
    applicantsMax: moreFilters.applicantsMax,
    includeEligibility: [...(moreFilters.includeEligibility ?? [])],
    educationLevelIds: [...(moreFilters.includeEducationLevels ?? [])],
    includeGpaBuckets: [...(moreFilters.includeGpaBuckets ?? [])],
    includeEasyApply: [...(moreFilters.includeEasyApply ?? [])],
    excludeRequirementTypes: [...(moreFilters.excludeRequirementTypes ?? [])],
    dataCompleteness: {
      low: Boolean(moreFilters.dataCompleteness?.low),
      medium: Boolean(moreFilters.dataCompleteness?.medium),
      high: Boolean(moreFilters.dataCompleteness?.high),
      verified: Boolean(moreFilters.dataCompleteness?.verified)
    },
    payout: {
      college: Boolean(moreFilters.payout?.college),
      student: Boolean(moreFilters.payout?.student),
      nonMonetary: Boolean(moreFilters.payout?.nonMonetary),
      notStated: Boolean(moreFilters.payout?.notStated)
    },
    stateQuery:
      typeof moreFilters.filterStateInput === 'string'
        ? moreFilters.filterStateInput
        : null
  } as Partial<ScholarshipFilterInput>;
}
