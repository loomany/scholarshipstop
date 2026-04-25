import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { PROFILE_GPA_SELECTION_SNAPSHOT_KEY } from '@/lib/constants/scholarshipGpaOptions';
import {
  buildScholarshipProfileFilterSeed,
  type ScholarshipProfileFilterSeed
} from '@/lib/scholarships/profileFilterDefaults';
import { computeHubProfileMatchPercent } from '@/lib/scholarships/hubProfileMatchScore';
import type {
  ProfilesRow,
  ScholarshipProfileMatchFields
} from '@/lib/scholarships/scholarshipMatch';

export type CurrentUserScholarshipMatchProfile = ScholarshipProfileMatchFields;

export function applyProfileMatchPercentToScholarships(
  scholarships: Scholarship[],
  profile: CurrentUserScholarshipMatchProfile | null
): Scholarship[] {
  if (!profile) return scholarships;
  if (!buildScholarshipProfileFilterSeed(profile as ProfilesRow)) {
    return scholarships;
  }
  return scholarships.map((scholarship) => {
    if (
      typeof scholarship.profileMatchPercent === 'number' &&
      !Number.isNaN(scholarship.profileMatchPercent)
    ) {
      return scholarship;
    }
    return {
      ...scholarship,
      profileMatchPercent: computeHubProfileMatchPercent(
        scholarship,
        profile as ProfilesRow
      )
    };
  });
}

function gpaFloorFromSeedBuckets(bucketIds: string[]): number | null {
  if (bucketIds.includes('gpa_3_5_plus')) return 3.5;
  if (bucketIds.includes('gpa_3_0_plus')) return 3.0;
  if (bucketIds.includes('gpa_2_5_plus')) return 2.5;
  if (bucketIds.includes('gpa_2_0_plus')) return 2.0;
  return null;
}

function profileFromGuestQuizSeed(
  seed: ScholarshipProfileFilterSeed
): CurrentUserScholarshipMatchProfile | null {
  const gpa = seed.gpa ?? gpaFloorFromSeedBuckets(seed.gpaBucketIds);
  const savedFiltersSnapshot = seed.gpaSelection
    ? { [PROFILE_GPA_SELECTION_SNAPSHOT_KEY]: seed.gpaSelection }
    : null;
  const profile: CurrentUserScholarshipMatchProfile = {
    field_of_study: seed.fieldOfStudy,
    field_of_study_label: null,
    school_level: seed.schoolLevel,
    citizenship_status: seed.citizenship,
    state_region: seed.stateInput,
    gpa,
    saved_filters_snapshot: savedFiltersSnapshot
  };

  return buildScholarshipProfileFilterSeed(profile as ProfilesRow)
    ? profile
    : null;
}

export function applyGuestQuizMatchPercentToScholarships(
  scholarships: Scholarship[],
  seed: ScholarshipProfileFilterSeed | null
): Scholarship[] {
  if (!seed) return scholarships;
  const profile = profileFromGuestQuizSeed(seed);
  if (!profile) return scholarships;
  return applyProfileMatchPercentToScholarships(scholarships, profile);
}
