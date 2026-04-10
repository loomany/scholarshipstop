import {
  cloneMoreFilters,
  defaultMoreFiltersFromBounds,
  type MoreFiltersState
} from '@/app/scholarships/moreFilters';
import type { ScholarshipListTabId } from '@/app/scholarships/scholarshipTabs';
import { normalizeUsStateToCanonical } from '@/lib/constants/usStates';
import { parseUserGpa, type ProfilesRow } from '@/lib/scholarships/scholarshipMatch';

export type ScholarshipProfileFilterSeed = {
  fieldOfStudy: string | null;
  schoolLevel: string | null;
  citizenship: string | null;
  stateInput: string;
  educationLevelIds: string[];
  gpaBucketIds: string[];
  eligibilityIds: string[];
};

function gpaBucketIdsFromProfileGpa(raw: ProfilesRow['gpa']): string[] {
  const gpa = parseUserGpa(raw);
  if (gpa == null) return [];
  if (gpa >= 3.5) return ['gpa_3_5_plus'];
  if (gpa >= 3.0) return ['gpa_3_0_plus'];
  if (gpa >= 2.5) return ['gpa_2_5_plus'];
  if (gpa >= 2.0) return ['gpa_2_0_plus'];
  return [];
}

function educationLevelIdsFromProfileSchoolLevel(
  schoolLevel: string | null | undefined
): string[] {
  const raw = schoolLevel?.trim() ?? '';
  if (!raw) return [];
  if (raw === 'high_school_senior') {
    return ['high_school_senior', 'high_school'];
  }
  if (raw.startsWith('high_school_')) {
    return ['high_school'];
  }
  if (raw.startsWith('college_')) {
    return ['undergraduate'];
  }
  if (raw === 'graduate_student') {
    return ['graduate'];
  }
  return [];
}

function eligibilityIdsFromProfileCitizenship(
  citizenship: string | null | undefined
): string[] {
  const raw = citizenship?.trim() ?? '';
  if (raw === 'international_student') {
    return ['international_students'];
  }
  return [];
}

export function buildScholarshipProfileFilterSeed(
  profile: ProfilesRow | null
): ScholarshipProfileFilterSeed | null {
  if (!profile) return null;

  const fieldOfStudy = profile.field_of_study?.trim() || null;
  const schoolLevel = profile.school_level?.trim() || null;
  const citizenship = profile.citizenship_status?.trim() || null;
  const stateInput = normalizeUsStateToCanonical(profile.state_region?.trim() ?? '') ?? '';
  const educationLevelIds = educationLevelIdsFromProfileSchoolLevel(schoolLevel);
  const gpaBucketIds = gpaBucketIdsFromProfileGpa(profile.gpa);
  const eligibilityIds = eligibilityIdsFromProfileCitizenship(citizenship);

  if (
    !fieldOfStudy &&
    !schoolLevel &&
    !citizenship &&
    !stateInput &&
    educationLevelIds.length === 0 &&
    gpaBucketIds.length === 0 &&
    eligibilityIds.length === 0
  ) {
    return null;
  }

  return {
    fieldOfStudy,
    schoolLevel,
    citizenship,
    stateInput,
    educationLevelIds,
    gpaBucketIds,
    eligibilityIds
  };
}

export function buildMoreFiltersWithProfileDefaults(
  bounds: {
    amountMin: number;
    amountMax: number;
    applicantsMin: number;
    applicantsMax: number;
  },
  seed: ScholarshipProfileFilterSeed | null | undefined
): MoreFiltersState {
  const next = defaultMoreFiltersFromBounds(bounds);
  if (!seed) return next;

  next.filterStateInput = seed.stateInput;
  next.includeEducationLevels = new Set(seed.educationLevelIds);
  next.includeGpaBuckets = new Set(seed.gpaBucketIds);
  next.includeEligibility = new Set(seed.eligibilityIds);
  return next;
}

/**
 * Best matches / Recommended: apply cabinet (profile) facets to the listing SQL when the user
 * has not chosen a stricter value in the hub UI. Missing profile fields produce no seed slice,
 * so those dimensions stay open (wider results).
 */
export function mergeBestRecommendationFiltersFromProfile(
  tab: ScholarshipListTabId,
  moreFilters: MoreFiltersState,
  seed: ScholarshipProfileFilterSeed | null,
  bounds: {
    amountMin: number;
    amountMax: number;
    applicantsMin: number;
    applicantsMax: number;
  }
): MoreFiltersState {
  const out = cloneMoreFilters(moreFilters);
  if ((tab !== 'best-matches' && tab !== 'recommended') || !seed) {
    return out;
  }

  const prof = buildMoreFiltersWithProfileDefaults(bounds, seed);

  if (!out.filterStateInput.trim() && prof.filterStateInput.trim()) {
    out.filterStateInput = prof.filterStateInput;
  }
  if (out.includeEducationLevels.size === 0 && prof.includeEducationLevels.size > 0) {
    out.includeEducationLevels = new Set(prof.includeEducationLevels);
  }
  if (out.includeGpaBuckets.size === 0 && prof.includeGpaBuckets.size > 0) {
    out.includeGpaBuckets = new Set(prof.includeGpaBuckets);
  }
  if (out.includeEligibility.size === 0 && prof.includeEligibility.size > 0) {
    out.includeEligibility = new Set(prof.includeEligibility);
  }

  return out;
}
