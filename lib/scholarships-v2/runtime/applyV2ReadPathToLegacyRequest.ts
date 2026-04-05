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

  };
}
