import type { MoreFiltersState } from '@/app/scholarships/moreFilters';
import { defaultMoreFiltersFromBounds } from '@/app/scholarships/moreFilters';

/** JSON-safe shape (no Sets) for POST body / localStorage. */
export type MoreFiltersJson = Omit<
  MoreFiltersState,
  | 'includeRequirementTypes'
  | 'includeEligibility'
  | 'includeEducationLevels'
  | 'includeGpaBuckets'
  | 'includeLocationLabels'
  | 'includeEasyApply'
> & {
  includeRequirementTypes: string[];
  includeEligibility: string[];
  includeEducationLevels: string[];
  includeGpaBuckets: string[];
  includeLocationLabels: string[];
  includeEasyApply: string[];
};

export function moreFiltersToJson(f: MoreFiltersState): MoreFiltersJson {
  return {
    ...f,
    includeRequirementTypes: Array.from(f.includeRequirementTypes),
    includeEligibility: Array.from(f.includeEligibility),
    includeEducationLevels: Array.from(f.includeEducationLevels),
    includeGpaBuckets: Array.from(f.includeGpaBuckets),
    includeLocationLabels: Array.from(f.includeLocationLabels),
    includeEasyApply: Array.from(f.includeEasyApply)
  };
}

export function moreFiltersFromJson(
  raw: MoreFiltersJson | null | undefined,
  boundsFallback: {
    amountMin: number;
    amountMax: number;
    applicantsMin: number;
    applicantsMax: number;
  }
): MoreFiltersState {
  if (!raw || typeof raw !== 'object') {
    return defaultMoreFiltersFromBounds(boundsFallback);
  }
  const d = defaultMoreFiltersFromBounds(boundsFallback);
  return {
    deadlinePreset: raw.deadlinePreset ?? d.deadlinePreset,
    amountMin: raw.amountMin ?? d.amountMin,
    amountMax: raw.amountMax ?? d.amountMax,
    applicantsMin: raw.applicantsMin ?? d.applicantsMin,
    applicantsMax: raw.applicantsMax ?? d.applicantsMax,
    includeRequirementTypes: new Set(
      raw.includeRequirementTypes ??
        ((raw as unknown as { excludeRequirementTypes?: string[] }).excludeRequirementTypes ?? [])
    ),
    dataCompleteness: {
      low: raw.dataCompleteness?.low ?? false,
      medium: raw.dataCompleteness?.medium ?? false,
      high: raw.dataCompleteness?.high ?? false,
      verified: raw.dataCompleteness?.verified ?? false
    },
    payout: {
      college: raw.payout?.college ?? false,
      student: raw.payout?.student ?? false,
      nonMonetary: raw.payout?.nonMonetary ?? false,
      notStated: raw.payout?.notStated ?? false
    },
    includeEligibility: new Set(raw.includeEligibility ?? []),
    includeEducationLevels: new Set(raw.includeEducationLevels ?? []),
    includeGpaBuckets: new Set(raw.includeGpaBuckets ?? []),
    includeLocationLabels: new Set(raw.includeLocationLabels ?? []),
    includeEasyApply: new Set(raw.includeEasyApply ?? []),
    filterStateInput:
      typeof raw.filterStateInput === 'string' ? raw.filterStateInput : ''
  };
}
