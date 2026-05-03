import type { OnboardingStep } from '@/lib/onboarding/onboardingFlowTypes';
import type { StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';

/** Last onboarding screen in the wizard (account creation). */
const UI_MAX_STEP = 7 as OnboardingStep;

/**
 * Furthest URL step: basics are split into 3 screens, then steps 4-6 open by progress.
 * Account fields are not required until step 6.
 */
export function getMaxAllowedOnboardingStep(
  draft: StoredOnboardingDraft
): OnboardingStep {
  const unspecified = draft.includeUnspecifiedApplicantCountries === true;
  const countryCode = draft.step4.countryCode?.trim().toUpperCase() ?? '';
  if (!countryCode && !unspecified) return 1;
  if (unspecified) {
    if (draft.activeStep <= 1) return 1;
    return UI_MAX_STEP;
  }
  if (draft.activeStep === 1) return 1;
  if (countryCode !== 'US') return UI_MAX_STEP;

  const schoolLevelReady = draft.step1.schoolLevel.trim().length > 0;
  if (!schoolLevelReady) return 2;

  const fieldOfStudyReady = draft.step1.fieldOfStudy.trim().length > 0;
  if (!fieldOfStudyReady) return 3;

  const citizenshipReady = draft.step1.citizenship.trim().length > 0;
  if (!citizenshipReady) return 4;

  const furthest = Math.min(draft.activeStep, UI_MAX_STEP) as OnboardingStep;
  return Math.min(UI_MAX_STEP, Math.max(5, furthest)) as OnboardingStep;
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

/** Sign-in surfaces “Create one” / “Sign up” → country-first account flow. */
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
