export const COMPARE_UNIVERSITY_PILOT_SLUGS = [
  'austin-community-college-vs-midlands-technical-college',
  'massachusetts-bay-community-college-massbay-vs-worcester-state-university'
] as const;

export const COMPARE_STATE_PILOT_SLUGS = [
  'california-vs-texas',
  'florida-vs-new-york'
] as const;

export type CompareUniversityPilotSlug = (typeof COMPARE_UNIVERSITY_PILOT_SLUGS)[number];
export type CompareStatePilotSlug = (typeof COMPARE_STATE_PILOT_SLUGS)[number];

export const COMPARE_PILOT_MAX_ROWS = 8;

const UNI_SET = new Set<string>(COMPARE_UNIVERSITY_PILOT_SLUGS);
const STATE_SET = new Set<string>(COMPARE_STATE_PILOT_SLUGS);

export function isCompareUniversityPilotSlug(
  slug: string | null | undefined
): slug is CompareUniversityPilotSlug {
  return Boolean(slug && UNI_SET.has(slug.trim().toLowerCase()));
}

export function isCompareStatePilotSlug(
  slug: string | null | undefined
): slug is CompareStatePilotSlug {
  return Boolean(slug && STATE_SET.has(slug.trim().toLowerCase()));
}
