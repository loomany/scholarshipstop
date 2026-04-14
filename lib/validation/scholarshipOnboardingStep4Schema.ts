import { normalizeUsStateToCanonical } from '@/lib/constants/usStates';
import type { OnboardingStep4DraftFields } from '@/lib/onboarding/onboardingFlowTypes';

/** Step 4 (state) — required; draft must normalize to a canonical U.S. state name. */
export function validateScholarshipOnboardingStep4Draft(
  values: OnboardingStep4DraftFields
): { ok: true } | { ok: false } {
  const canonical = normalizeUsStateToCanonical(values.state ?? '');
  if (!canonical) return { ok: false };
  return { ok: true };
}
