/**
 * Separate localStorage draft for `/get-scholarships` quiz only.
 * Does not touch `scholarship_onboarding_draft_v2` used by `/onboarding`.
 */

import type {
  OnboardingFormValues,
  OnboardingStep2DraftFields,
  OnboardingStep3DraftFields,
  OnboardingStep4DraftFields,
  StoredOnboardingDraft
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import { mergeDraftWithDefaults } from '@/lib/onboarding/scholarshipOnboardingDraft';

export const GET_SCHOLARSHIPS_QUIZ_DRAFT_KEY =
  'scholarship_get_scholarships_quiz_draft_v1';
export const COMPLETED_GET_SCHOLARSHIPS_QUIZ_DRAFT_KEY =
  'scholarship_get_scholarships_quiz_completed_v1';

function withLandingMeta(draft: StoredOnboardingDraft): StoredOnboardingDraft {
  return { ...draft, v: 7, quizVariant: 'landing_no_birth' };
}

function writeLanding(draft: StoredOnboardingDraft): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      GET_SCHOLARSHIPS_QUIZ_DRAFT_KEY,
      JSON.stringify(withLandingMeta(draft))
    );
  } catch (error) {
    console.warn('[landing-quiz] write draft failed', error);
  }
}

export function emptyLandingQuizDraft(): StoredOnboardingDraft {
  return withLandingMeta({
    v: 7,
    activeStep: 1,
    step1: mergeDraftWithDefaults(null),
    step2: { firstName: '', lastName: '', email: '' },
    step3: { gpa: '' },
    step4: { state: '' }
  });
}

export function loadLandingQuizDraft(): StoredOnboardingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GET_SCHOLARSHIPS_QUIZ_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredOnboardingDraft;
    if (!parsed || parsed.v !== 7 || typeof parsed.step1 !== 'object') {
      return null;
    }
    return withLandingMeta(parsed);
  } catch (error) {
    console.warn('[landing-quiz] read draft failed', error);
    return null;
  }
}

export function saveFullLandingQuizDraft(draft: StoredOnboardingDraft): void {
  writeLanding(draft);
}

export function loadCompletedLandingQuizDraft(): StoredOnboardingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COMPLETED_GET_SCHOLARSHIPS_QUIZ_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredOnboardingDraft;
    if (!parsed || parsed.v !== 7 || typeof parsed.step1 !== 'object') {
      return null;
    }
    return withLandingMeta(parsed);
  } catch (error) {
    console.warn('[landing-quiz] read completed draft failed', error);
    return null;
  }
}

export function saveCompletedLandingQuizDraft(draft: StoredOnboardingDraft): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      COMPLETED_GET_SCHOLARSHIPS_QUIZ_DRAFT_KEY,
      JSON.stringify(withLandingMeta(draft))
    );
  } catch (error) {
    console.warn('[landing-quiz] write completed draft failed', error);
  }
}

export function mergeAndSaveStep1LandingForm(
  values: OnboardingFormValues,
  base: StoredOnboardingDraft | null
): void {
  const prev = base ?? emptyLandingQuizDraft();
  writeLanding({
    ...withLandingMeta(prev),
    step1: { ...values }
  });
}

export function saveStep2LandingDraftFields(
  step2: OnboardingStep2DraftFields,
  base: StoredOnboardingDraft | null
): void {
  const prev = base ?? emptyLandingQuizDraft();
  writeLanding({
    ...withLandingMeta(prev),
    step2: { ...step2 }
  });
}

export function saveStep3LandingDraftFields(
  step3: OnboardingStep3DraftFields,
  base: StoredOnboardingDraft | null
): void {
  const prev = base ?? emptyLandingQuizDraft();
  writeLanding({
    ...withLandingMeta(prev),
    step3: { ...step3 }
  });
}

export function saveStep4LandingDraftFields(
  step4: OnboardingStep4DraftFields,
  base: StoredOnboardingDraft | null
): void {
  const prev = base ?? emptyLandingQuizDraft();
  writeLanding({
    ...withLandingMeta(prev),
    step4: { ...step4 }
  });
}

export function clearLandingQuizDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(GET_SCHOLARSHIPS_QUIZ_DRAFT_KEY);
  } catch (error) {
    console.warn('[landing-quiz] clear draft failed', error);
  }
}
