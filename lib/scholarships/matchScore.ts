/**
 * Foundation for scholarship ↔ user matching (weights and tiers).
 * Full scoring will use grant fields such as eligible_school_levels, age bounds, etc.
 */

import type { UserProfile } from '@/lib/onboarding/userProfile';

export const MATCH_SCORE_WEIGHTS = {
  schoolLevel: 40,
  fieldOfStudy: 35,
  ageEligibility: 15,
  relevanceTags: 10
} as const;

export type MatchScoreTier = 'strong' | 'good' | 'partial' | 'weak';

export function matchTierFromScore(score: number): MatchScoreTier {
  if (score >= 90) return 'strong';
  if (score >= 70) return 'good';
  if (score >= 40) return 'partial';
  return 'weak';
}

/** Placeholder inputs until grants expose eligibility dimensions. */
export type GrantMatchEligibility = {
  eligibleSchoolLevelSlugs?: string[] | null;
  eligibleFieldOfStudySlugs?: string[] | null;
  ageMin?: number | null;
  ageMax?: number | null;
  tagOverlapWeight?: number;
};

export function computeScholarshipMatchScore(
  _user: UserProfile,
  _grant: GrantMatchEligibility,
  _userAgeYears: number | null
): number {
  /* Implement when grant eligibility fields exist in the catalog. */
  return 0;
}
