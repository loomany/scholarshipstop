import { validateScholarshipOnboarding } from '@/lib/validation/scholarshipOnboardingSchema';
import type { OnboardingStep } from '@/lib/onboarding/onboardingFlowTypes';
import type { StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';

/** Last onboarding screen in the wizard (account creation). Email confirm is no longer a step. */
const UI_MAX_STEP = 4 as OnboardingStep;

/**
 * Furthest URL step: after basics (step 1) user may open 2–4 only as far as `activeStep`
 * has progressed. Account fields are not required until step 4.
 */
export function getMaxAllowedOnboardingStep(
  draft: StoredOnboardingDraft
): OnboardingStep {
  if (!validateScholarshipOnboarding(draft.step1).ok) return 1;
  const furthest = Math.min(draft.activeStep, UI_MAX_STEP) as OnboardingStep;
  const cap = Math.min(UI_MAX_STEP, Math.max(2, furthest)) as OnboardingStep;
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
  const r = Math.min(requested, UI_MAX_STEP) as OnboardingStep;
  if (r > maxAllowed) return maxAllowed;
  return r;
}

export function normalizeOnboardingStepParam(n: number): OnboardingStep | null {
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return null;
}

export function defaultResumeOnboardingStep(
  draft: StoredOnboardingDraft
): OnboardingStep {
  return getMaxAllowedOnboardingStep(draft);
}
