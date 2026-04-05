import {
  defaultMoreFiltersFromBounds,
  type MoreFiltersState
} from '@/app/scholarships/moreFilters';
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
