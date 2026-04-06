import type { OnboardingStep4DraftFields } from '@/lib/onboarding/onboardingFlowTypes';

/** Step 4 (state) — optional; any string allowed in draft; canonical save happens in build profile. */
export function validateScholarshipOnboardingStep4Draft(
  _values: OnboardingStep4DraftFields
): { ok: true } {
  return { ok: true };
}
