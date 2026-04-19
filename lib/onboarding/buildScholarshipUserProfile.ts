import { normalizeUsStateToCanonical } from '@/lib/constants/usStates';
import {
  gpaForProfile,
  withProfileGpaSelectionSnapshot
} from '@/lib/constants/scholarshipGpaOptions';
import type { UserProfile } from '@/lib/onboarding/userProfile';
import type { StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';
import {
  validateScholarshipOnboarding,
  validateScholarshipOnboardingBasicsWithoutBirth
} from '@/lib/validation/scholarshipOnboardingSchema';
import {
  validateScholarshipOnboardingStep2Draft,
  validateScholarshipOnboardingStep2DraftForGoogleOAuth
} from '@/lib/validation/scholarshipOnboardingStep2Schema';
import { validateScholarshipOnboardingStep3Gpa } from '@/lib/validation/scholarshipOnboardingStep3Schema';
import { validateScholarshipOnboardingStep4Draft } from '@/lib/validation/scholarshipOnboardingStep4Schema';

export type BuildCompleteScholarshipUserProfileOptions = {
  /**
   * When true, step 2 does not require email or names (Google supplies them).
   * Still validates demographics (step 1), GPA, and U.S. state.
   */
  forGoogleOAuth?: boolean;
};

export function buildCompleteScholarshipUserProfile(
  draft: StoredOnboardingDraft,
  options?: BuildCompleteScholarshipUserProfileOptions
): { ok: true; profile: UserProfile } | { ok: false } {
  const forOAuth = options?.forGoogleOAuth === true;
  const s1 =
    draft.quizVariant === 'landing_no_birth'
      ? validateScholarshipOnboardingBasicsWithoutBirth(draft.step1)
      : validateScholarshipOnboarding(draft.step1);
  if (!s1.ok) return { ok: false };
  const step2Ok = forOAuth
    ? validateScholarshipOnboardingStep2DraftForGoogleOAuth(draft.step2).ok
    : validateScholarshipOnboardingStep2Draft(draft.step2).ok;
  if (!step2Ok) {
    return { ok: false };
  }
  if (!validateScholarshipOnboardingStep3Gpa(draft.step3).ok) return { ok: false };
  if (!validateScholarshipOnboardingStep4Draft(draft.step4).ok) return { ok: false };

  const p = s1.profile;
  const fn = draft.step2.firstName.trim() || null;
  const ln = draft.step2.lastName.trim() || null;
  const stateRegion = normalizeUsStateToCanonical(draft.step4.state);
  const gpaChoice = draft.step3.gpa.trim();
  return {
    ok: true,
    profile: {
      ...p,
      firstName: fn,
      lastName: ln,
      countryCode: null,
      stateRegion,
      city: null,
      gpa: gpaForProfile(gpaChoice),
      savedFiltersSnapshot: withProfileGpaSelectionSnapshot(null, gpaChoice),
      onboardingCompleted: true,
      emailVerified: false
    }
  };
}
