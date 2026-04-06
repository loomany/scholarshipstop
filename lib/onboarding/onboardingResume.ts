import { validateScholarshipOnboarding } from '@/lib/validation/scholarshipOnboardingSchema';
import type { OnboardingStep } from '@/lib/onboarding/onboardingFlowTypes';
import type { StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';

const MAX_STEP = 4 as const;

/**
 * Furthest URL step: after basics (step 1) user may open 2–4 only as far as `activeStep`
 * has progressed. Account fields are not required until step 4.
 */
export function getMaxAllowedOnboardingStep(
  draft: StoredOnboardingDraft
): OnboardingStep {
  if (!validateScholarshipOnboarding(draft.step1).ok) return 1;
  const furthest = draft.activeStep;
  const cap = Math.min(MAX_STEP, Math.max(2, furthest)) as OnboardingStep;
  return cap;
}

export function onboardingStepHref(step: OnboardingStep): string {
  return `/onboarding?step=${step}`;
}

/** Sign-in surfaces “Create one” / “Sign up” → new account flow, step 1 (“Tell us about you”). */
export const SCHOLARSHIP_ONBOARDING_SIGNUP_ENTRY_HREF = onboardingStepHref(1);

export function clampOnboardingStepToProgress(
  draft: StoredOnboardingDraft,
  requested: OnboardingStep
): OnboardingStep {
  const maxAllowed = getMaxAllowedOnboardingStep(draft);
  if (requested < 1) return 1;
  if (requested > MAX_STEP) return MAX_STEP;
  if (requested > maxAllowed) return maxAllowed;
  return requested;
}

export function normalizeOnboardingStepParam(n: number): OnboardingStep | null {
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return null;
}

export function defaultResumeOnboardingStep(
  draft: StoredOnboardingDraft
): OnboardingStep {
  return getMaxAllowedOnboardingStep(draft);
}
