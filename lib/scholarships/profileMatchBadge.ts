import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { buildScholarshipProfileFilterSeed } from '@/lib/scholarships/profileFilterDefaults';
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
