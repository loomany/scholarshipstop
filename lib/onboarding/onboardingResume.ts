import type { OnboardingStep } from '@/lib/onboarding/onboardingFlowTypes';
import type { StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';

/**
 * Country-first flow: step 1 = applicant country, step 2 = account.
 * Also caps legacy `?step=` values (3–7) down to the furthest allowed step.
 */
const UI_MAX_STEP = 2 as OnboardingStep;

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
  return UI_MAX_STEP;
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
