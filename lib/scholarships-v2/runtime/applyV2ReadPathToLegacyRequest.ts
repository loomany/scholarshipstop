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

/**
 * Runtime safety: rewrite only URL-derived listing fields that have stable parity.
 * Keep moreFilters from legacy request untouched to avoid lossy round-trips
 * (some legacy runtime facets are not fully represented in v2 bridge contract yet).
 */
return {
  ...args.request,
  return {
    ...args.request,
    q: filters.q ?? '',
    deadline: filters.deadlinePreset,
    stateCodes: [...filters.stateCodes],
    saved: [...filters.savedIds],
    ignored: [...filters.ignoredIds],
    started: [...filters.startedIds],
    submitted: [...filters.submittedIds],
tab: filters.userCollectionTab ?? args.request.tab
  };
}
