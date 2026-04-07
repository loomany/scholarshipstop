import { normalizeUsStateToCanonical } from '@/lib/constants/usStates';
import { gpaForProfile } from '@/lib/constants/scholarshipGpaOptions';
import type { UserProfile } from '@/lib/onboarding/userProfile';
import type { StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';
import { validateScholarshipOnboarding } from '@/lib/validation/scholarshipOnboardingSchema';
import { validateScholarshipOnboardingStep2Draft } from '@/lib/validation/scholarshipOnboardingStep2Schema';
import { validateScholarshipOnboardingStep3Gpa } from '@/lib/validation/scholarshipOnboardingStep3Schema';
import { validateScholarshipOnboardingStep4Draft } from '@/lib/validation/scholarshipOnboardingStep4Schema';

export function buildCompleteScholarshipUserProfile(
  draft: StoredOnboardingDraft
): { ok: true; profile: UserProfile } | { ok: false } {
  const s1 = validateScholarshipOnboarding(draft.step1);
  if (!s1.ok) return { ok: false };
  if (!validateScholarshipOnboardingStep2Draft(draft.step2).ok) {
    return { ok: false };
  }
  if (!validateScholarshipOnboardingStep3Gpa(draft.step3).ok) return { ok: false };
  if (!validateScholarshipOnboardingStep4Draft(draft.step4).ok) return { ok: false };

  const p = s1.profile;
  const fn = draft.step2.firstName.trim() || null;
  const ln = draft.step2.lastName.trim() || null;
  const stateRegion = normalizeUsStateToCanonical(draft.step4.state);
  return {
    ok: true,
    profile: {
      ...p,
      firstName: fn,
      lastName: ln,
      countryCode: null,
      stateRegion,
      city: null,
      gpa: gpaForProfile(draft.step3.gpa),
      onboardingCompleted: true,
      emailVerified: false
    }
  };
}
