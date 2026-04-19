import { profileGpaSelectionFromSnapshot } from '@/lib/constants/scholarshipGpaOptions';
import { parseUserGpa, type ProfilesRow } from '@/lib/scholarships/scholarshipMatch';

type GpaProfile = Pick<ProfilesRow, 'gpa' | 'saved_filters_snapshot'> | null | undefined;

const GPA_BUCKETS_ASC = [
  { id: 'gpa_2_0_plus', floor: 2.0 },
  { id: 'gpa_2_5_plus', floor: 2.5 },
  { id: 'gpa_3_0_plus', floor: 3.0 },
  { id: 'gpa_3_5_plus', floor: 3.5 }
] as const;

function formatGpa(value: number): string {
  return value.toFixed(1);
}

function exactBucketIdForGpa(value: number): string | null {
  const rounded = Number(value.toFixed(1));
  const exact = GPA_BUCKETS_ASC.find((entry) => Math.abs(entry.floor - rounded) < 1e-6);
  return exact?.id ?? null;
}

function bucketIdsAtOrAbove(value: number): string[] {
  return GPA_BUCKETS_ASC.filter((entry) => entry.floor + 1e-6 >= value).map(
    (entry) => entry.id
  );
}

export function buildBestRecommendationProfileGpaOrParts(
  profile: GpaProfile
): string[] {
  if (!profile) return [];

  const bucketChoice = profileGpaSelectionFromSnapshot(profile.saved_filters_snapshot);
  if (bucketChoice) {
    const floor = parseUserGpa(bucketChoice);
    if (floor == null) return [];

    const bucketIds = bucketIdsAtOrAbove(floor);
    const parts = [`gpa_requirement_min.gte.${formatGpa(floor)}`];
    if (bucketIds.length > 0) {
      parts.push(
        `and(gpa_requirement_min.is.null,gpa_bucket.in.(${bucketIds.join(',')}))`
      );
    }
    return parts;
  }

  const exact = parseUserGpa(profile.gpa);
  if (exact == null) return [];

  const upper = Number((exact + 0.1).toFixed(1));
  const parts = [
    `and(gpa_requirement_min.gte.${formatGpa(exact)},gpa_requirement_min.lt.${formatGpa(upper)})`
  ];
  const exactBucketId = exactBucketIdForGpa(exact);
  if (exactBucketId) {
    parts.push(`and(gpa_requirement_min.is.null,gpa_bucket.eq.${exactBucketId})`);
  }
  return parts;
}
