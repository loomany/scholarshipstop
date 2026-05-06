import {
  composeBirthDateValue,
  parseBirthDayValue,
  parseBirthMonthValue,
  parseBirthYearValue
} from '@/lib/validation/birthDateFields';
import type { UserProfile } from '@/lib/onboarding/userProfile';
import type { StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';
import {
  validateScholarshipOnboardingStep2Draft,
  validateScholarshipOnboardingStep2DraftForGoogleOAuth
} from '@/lib/validation/scholarshipOnboardingStep2Schema';
import { normalizeCountryCode } from '@/lib/scholarships/countryEligibility/countries';

export type BuildCompleteScholarshipUserProfileOptions = {
  /**
   * When true, step 2 does not require email or names (Google supplies them).
   */
  forGoogleOAuth?: boolean;
};

export function buildCompleteScholarshipUserProfile(
  draft: StoredOnboardingDraft,
  options?: BuildCompleteScholarshipUserProfileOptions
): { ok: true; profile: UserProfile } | { ok: false } {
  const forOAuth = options?.forGoogleOAuth === true;
  const unspecifiedApplicant =
    draft.includeUnspecifiedApplicantCountries === true;
  const countryCode = normalizeCountryCode(draft.step4.countryCode);
  if (!countryCode && !unspecifiedApplicant) return { ok: false };

  const step2Ok = forOAuth
    ? validateScholarshipOnboardingStep2DraftForGoogleOAuth(draft.step2).ok
    : validateScholarshipOnboardingStep2Draft(draft.step2).ok;
  if (!step2Ok) {
    return { ok: false };
  }

  if (unspecifiedApplicant) {
    const monthValue = parseBirthMonthValue(draft.step1.birthMonth);
    const dayValue = parseBirthDayValue(draft.step1.birthDay);
    const yearValue = parseBirthYearValue(draft.step1.birthYear);
    return {
      ok: true,
      profile: {
        firstName: draft.step2.firstName.trim() || null,
        lastName: draft.step2.lastName.trim() || null,
        birthMonth: monthValue,
        birthDay: dayValue,
        birthYear: yearValue,
        dateOfBirth: composeBirthDateValue(monthValue, dayValue, yearValue),
        schoolLevel: null,
        schoolLevelLabel: null,
        fieldOfStudy: null,
        fieldOfStudyLabel: null,
        citizenshipStatus: null,
        citizenshipStatusLabel: null,
        countryCode: null,
        stateRegion: null,
        city: null,
        gpa: null,
        savedFiltersSnapshot: { includeUnspecifiedApplicantCountries: true },
        onboardingCompleted: true,
        emailVerified: false
      }
    };
  }

  const monthValue = parseBirthMonthValue(draft.step1.birthMonth);
  const dayValue = parseBirthDayValue(draft.step1.birthDay);
  const yearValue = parseBirthYearValue(draft.step1.birthYear);
  return {
    ok: true,
    profile: {
      firstName: draft.step2.firstName.trim() || null,
      lastName: draft.step2.lastName.trim() || null,
      birthMonth: monthValue,
      birthDay: dayValue,
      birthYear: yearValue,
      dateOfBirth: composeBirthDateValue(monthValue, dayValue, yearValue),
      schoolLevel: null,
      schoolLevelLabel: null,
      fieldOfStudy: null,
      fieldOfStudyLabel: null,
      citizenshipStatus: null,
      citizenshipStatusLabel: null,
      countryCode,
      stateRegion: null,
      city: null,
      gpa: null,
      savedFiltersSnapshot: null,
      onboardingCompleted: true,
      emailVerified: false
    }
  };
}
