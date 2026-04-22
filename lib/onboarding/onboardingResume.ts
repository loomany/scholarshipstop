import type { OnboardingStep } from '@/lib/onboarding/onboardingFlowTypes';
import type { StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';

/** Last onboarding screen in the wizard (account creation). Email confirm is no longer a step. */
const UI_MAX_STEP = 6 as OnboardingStep;

/**
 * Furthest URL step: basics are split into 3 screens, then steps 4-6 open by progress.
 * Account fields are not required until step 6.
 */
export function getMaxAllowedOnboardingStep(
  draft: StoredOnboardingDraft
): OnboardingStep {
  const schoolLevelReady = draft.step1.schoolLevel.trim().length > 0;
  if (!schoolLevelReady) return 1;

  const fieldOfStudyReady = draft.step1.fieldOfStudy.trim().length > 0;
  if (!fieldOfStudyReady) return 2;

  const citizenshipReady = draft.step1.citizenship.trim().length > 0;
  if (!citizenshipReady) return 3;

  const furthest = Math.min(draft.activeStep, UI_MAX_STEP) as OnboardingStep;
  return Math.min(UI_MAX_STEP, Math.max(4, furthest)) as OnboardingStep;
}

export function onboardingStepHref(
  step: OnboardingStep,
  nextPath?: string | null
): string {
  const base = `/onboarding?step=${step}`;
  const n = nextPath?.trim();
  if (!n) return base;
  return `${base}&next=${encodeURIComponent(n)}`;
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
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6 || n === 7) return n;
  return null;
}

export function defaultResumeOnboardingStep(
  draft: StoredOnboardingDraft
): OnboardingStep {
  return getMaxAllowedOnboardingStep(draft);
}
