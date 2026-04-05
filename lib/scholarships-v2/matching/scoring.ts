import type {
  ScholarshipEligibilitySnapshot,
  ScholarshipMatchScoreBreakdown,
  ScholarshipMatchSignals,
  ScholarshipProfileSignals
} from '@/lib/scholarships-v2/types';

function hasValue(values: string[], value: string | null | undefined): boolean {
  if (!value) return false;
  return values.includes(value);
}

function normalizeText(value: string | null | undefined): string {
  return value?.toLowerCase().trim() ?? '';
}

function scoreState(
  profile: ScholarshipProfileSignals,
  scholarship: ScholarshipEligibilitySnapshot
): number {
  const stateCode = profile.stateCode?.toUpperCase();
  if (!stateCode) return 0;

  if (scholarship.eligibleStateCodes.includes(stateCode)) return 1;

  const fallbackText = normalizeText(scholarship.stateTerritoryText);
  if (fallbackText && fallbackText.includes(stateCode.toLowerCase())) return 0.75;

  return 0;
}

function scoreGpa(profile: ScholarshipProfileSignals, scholarship: ScholarshipEligibilitySnapshot): number {
  if (profile.gpa == null) return 0;
  if (scholarship.minGpa != null && profile.gpa < scholarship.minGpa) return 0;
  if (scholarship.maxGpa != null && profile.gpa > scholarship.maxGpa) return 0;
  return 1;
}

export function scoreScholarshipMatch(signals: ScholarshipMatchSignals): ScholarshipMatchScoreBreakdown {
  const education = hasValue(signals.scholarship.educationLevels, signals.profile.educationLevelId) ? 1 : 0;
  const citizenship = hasValue(signals.scholarship.citizenships, signals.profile.citizenshipId) ? 1 : 0;
  const state = scoreState(signals.profile, signals.scholarship);
  const fieldOfStudy = hasValue(signals.scholarship.fieldsOfStudy, signals.profile.fieldOfStudy) ? 1 : 0;
  const gpa = scoreGpa(signals.profile, signals.scholarship);

  const total = education * 0.3 + citizenship * 0.25 + state * 0.2 + fieldOfStudy * 0.15 + gpa * 0.1;

  return {
    total,
    education,
    citizenship,
    state,
    fieldOfStudy,
    gpa
  };
}
