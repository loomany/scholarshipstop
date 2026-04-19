/**
 * When a guest fills the `/get-scholarships` quiz, data lives in a separate
 * localStorage key. On account creation (`/onboarding`), merge it into the
 * main onboarding draft so they only add DOB + account fields when missing.
 *
 * After a completed quiz we also stash a sessionStorage snapshot before
 * clearing the landing draft (hub redirect), so browsing still allows merge.
 */

import { clearLandingQuizDraft, loadLandingQuizDraft } from '@/lib/onboarding/getScholarshipsLandingDraft';
import {
  loadStoredOnboardingDraft,
  mergeDraftWithDefaults,
  saveFullOnboardingDraft,
  type OnboardingFormValues,
  type StoredOnboardingDraft
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import { validateScholarshipOnboarding } from '@/lib/validation/scholarshipOnboardingSchema';
import { validateScholarshipOnboardingStep3Gpa } from '@/lib/validation/scholarshipOnboardingStep3Schema';
import { validateScholarshipOnboardingStep4Draft } from '@/lib/validation/scholarshipOnboardingStep4Schema';
import type { OnboardingStep } from '@/lib/onboarding/onboardingFlowTypes';
import {
  buildScholarshipProfileFilterSeedFromQuizDraft,
  type ScholarshipProfileFilterSeed
} from '@/lib/scholarships/profileFilterDefaults';

/** sessionStorage: full quiz draft after “finish” before landing key is cleared. */
export const PENDING_ONBOARDING_FROM_LANDING_SESSION_KEY =
  'scholarship_pending_onboarding_from_landing_v1';

function preferNonEmpty(landingVal: string, baseVal: string): string {
  const l = landingVal?.trim() ?? '';
  if (l) return l;
  return baseVal?.trim() ?? '';
}

function emptyBase(): StoredOnboardingDraft {
  return {
    v: 7,
    activeStep: 1,
    step1: mergeDraftWithDefaults(null),
    step2: { firstName: '', lastName: '', email: '' },
    step3: { gpa: '' },
    step4: { state: '' }
  };
}

export function hasUsableLandingQuizData(landing: StoredOnboardingDraft): boolean {
  const s1 = landing.step1;
  if (s1.schoolLevel?.trim() || s1.fieldOfStudy?.trim() || s1.citizenship?.trim()) {
    return true;
  }
  if (landing.step3.gpa?.trim()) return true;
  if (landing.step4.state?.trim()) return true;
  return false;
}

function parseSessionDraft(raw: string): StoredOnboardingDraft | null {
  try {
    const parsed = JSON.parse(raw) as StoredOnboardingDraft;
    if (!parsed || parsed.v !== 7 || typeof parsed.step1 !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Call when the user finishes the landing quiz, before `clearLandingQuizDraft()`.
 */
export function stashLandingQuizDraftForOnboardingMerge(
  draft: StoredOnboardingDraft
): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      PENDING_ONBOARDING_FROM_LANDING_SESSION_KEY,
      JSON.stringify(draft)
    );
  } catch {
    /* quota / private mode */
  }
}

/**
 * Rebuild the hub filter seed after refresh: `LANDING_QUIZ_HUB_SEED_KEY` is one-shot removed on
 * first hub load, but `PENDING_ONBOARDING_FROM_LANDING_SESSION_KEY` stays until `/onboarding` merge.
 */
export function tryBuildProfileSeedFromPendingLandingSession(): ScholarshipProfileFilterSeed | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PENDING_ONBOARDING_FROM_LANDING_SESSION_KEY);
    if (!raw) return null;
    const draft = parseSessionDraft(raw);
    if (!draft) return null;
    return buildScholarshipProfileFilterSeedFromQuizDraft(draft);
  } catch {
    return null;
  }
}

function stripQuizVariant(d: StoredOnboardingDraft): StoredOnboardingDraft {
  const copy: StoredOnboardingDraft = { ...d, v: 7 };
  delete copy.quizVariant;
  return copy;
}

function mergeSourceIntoBase(
  source: StoredOnboardingDraft,
  base: StoredOnboardingDraft | null
): StoredOnboardingDraft {
  const b = base ? stripQuizVariant(base) : emptyBase();

  const step1: OnboardingFormValues = {
    birthMonth: b.step1.birthMonth,
    birthDay: b.step1.birthDay,
    birthYear: b.step1.birthYear,
    schoolLevel: preferNonEmpty(source.step1.schoolLevel, b.step1.schoolLevel),
    fieldOfStudy: preferNonEmpty(source.step1.fieldOfStudy, b.step1.fieldOfStudy),
    citizenship: preferNonEmpty(source.step1.citizenship, b.step1.citizenship)
  };

  return {
    v: 7,
    activeStep: b.activeStep,
    step1,
    step2: { ...b.step2 },
    step3: {
      gpa: preferNonEmpty(source.step3.gpa, b.step3.gpa)
    },
    step4: {
      state: preferNonEmpty(source.step4.state, b.step4.state)
    }
  };
}

/**
 * First incomplete step after merge (full DOB required on step 1).
 * Wizard order: 1 basics → 2 state → 3 GPA → 4 account.
 */
export function computeResumeStepAfterLandingMerge(
  d: StoredOnboardingDraft
): OnboardingStep {
  if (!validateScholarshipOnboarding(d.step1).ok) return 1;
  if (!validateScholarshipOnboardingStep4Draft(d.step4).ok) return 2;
  if (!validateScholarshipOnboardingStep3Gpa(d.step3).ok) return 3;
  return 4;
}

/**
 * Merges session snapshot (post-quiz) or landing localStorage draft into the main
 * onboarding draft. Clears sources after success. Returns the merged draft, or null.
 */
export function applyPendingLandingQuizMergeIfNeeded(): StoredOnboardingDraft | null {
  if (typeof window === 'undefined') return null;

  let sessionDraft: StoredOnboardingDraft | null = null;
  try {
    const raw = sessionStorage.getItem(PENDING_ONBOARDING_FROM_LANDING_SESSION_KEY);
    if (raw) sessionDraft = parseSessionDraft(raw);
  } catch {
    /* ignore */
  }

  const landingDraft = loadLandingQuizDraft();
  const source =
    sessionDraft ??
    (landingDraft && hasUsableLandingQuizData(landingDraft) ? landingDraft : null);

  if (!source) return null;

  const base = loadStoredOnboardingDraft();
  const merged = mergeSourceIntoBase(source, base);
  const next: StoredOnboardingDraft = {
    ...merged,
    activeStep: computeResumeStepAfterLandingMerge(merged)
  };

  saveFullOnboardingDraft(next);
  try {
    sessionStorage.removeItem(PENDING_ONBOARDING_FROM_LANDING_SESSION_KEY);
  } catch {
    /* ignore */
  }
  clearLandingQuizDraft();

  return next;
}
