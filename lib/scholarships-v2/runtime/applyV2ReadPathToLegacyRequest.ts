import type { ScholarshipListRequest } from '@/lib/scholarships/scholarshipListServer';
import type { MoreFiltersJson } from '@/lib/scholarships/scholarshipListApiCodec';
import { buildV2FiltersFromLegacyInput } from '@/lib/scholarships-v2/adapters/buildV2FiltersFromLegacy';

export function applyV2ReadPathToLegacyRequest(args: {
  request: ScholarshipListRequest;
  searchParams: URLSearchParams;
  moreFilters: MoreFiltersJson | null | undefined;
}): ScholarshipListRequest {
  const filters = buildV2FiltersFromLegacyInput({
    searchParams: args.searchParams,
    moreFilters: args.moreFilters
  });

  return {
    ...args.request,
    q: filters.q ?? '',
    deadline: filters.deadlinePreset,
    stateCodes: [...filters.stateCodes],
    saved: [...filters.savedIds],
    ignored: [...filters.ignoredIds],
    started: [...filters.startedIds],
    submitted: [...filters.submittedIds],
    tab: filters.userCollectionTab ?? args.request.tab,
    moreFilters: {
      ...args.request.moreFilters,
      deadlinePreset: filters.deadlinePreset,
      amountMin: filters.minAmount ?? args.request.moreFilters.amountMin,
      amountMax: filters.maxAmount ?? args.request.moreFilters.amountMax,
      applicantsMin: filters.applicantsMin ?? args.request.moreFilters.applicantsMin,
      applicantsMax: filters.applicantsMax ?? args.request.moreFilters.applicantsMax,
      excludeRequirementTypes: new Set(filters.excludeRequirementTypes),
      dataCompleteness: {
        low: filters.dataCompleteness.low,
        medium: filters.dataCompleteness.medium,
        high: filters.dataCompleteness.high,
        verified: filters.dataCompleteness.verified
      },
      payout: {
        college: filters.payout.college,
        student: filters.payout.student,
        nonMonetary: filters.payout.nonMonetary,
        notStated: filters.payout.notStated
      },
      includeEligibility: new Set(filters.includeEligibility),
      includeEducationLevels: new Set(filters.educationLevelIds),
      includeGpaBuckets: new Set(filters.includeGpaBuckets),
      includeLocationLabels: new Set(args.request.moreFilters.includeLocationLabels),
      includeEasyApply: new Set(filters.includeEasyApply),
      filterStateInput: filters.stateQuery ?? ''
    }
  };
}
