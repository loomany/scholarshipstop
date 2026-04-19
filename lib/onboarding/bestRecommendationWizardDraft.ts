'use client';

import type {
  OnboardingFormValues,
  OnboardingStep2DraftFields,
  OnboardingStep3DraftFields,
  OnboardingStep4DraftFields,
  StoredOnboardingDraft
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import {
  loadStoredOnboardingDraft,
  mergeDraftWithDefaults,
  saveFullOnboardingDraft
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import { normalizeUsStateToCanonical } from '@/lib/constants/usStates';
import {
  buildScholarshipProfileFilterSeedFromDraftWithoutBirth,
  type ScholarshipProfileFilterSeed
} from '@/lib/scholarships/profileFilterDefaults';
import { validateScholarshipOnboardingBasicsWithoutBirth } from '@/lib/validation/scholarshipOnboardingSchema';
import { validateScholarshipOnboardingStep3Gpa } from '@/lib/validation/scholarshipOnboardingStep3Schema';

export const BEST_RECOMMENDATION_WIZARD_DRAFT_KEY =
  'scholarship_best_recommendation_wizard_draft_v1';

export type BestRecommendationWizardMode = 'guest' | 'signed-in';

export type BestRecommendationWizardStore = {
  v: 1;
  mode: BestRecommendationWizardMode;
  submitted: boolean;
  draft: StoredOnboardingDraft;
};

function emptyStep2(): OnboardingStep2DraftFields {
  return { firstName: '', lastName: '', email: '' };
}

function emptyStep3(): OnboardingStep3DraftFields {
  return { gpa: '' };
}

function emptyStep4(): OnboardingStep4DraftFields {
  return { state: '' };
}

function normalizeActiveStep(n: unknown): 1 | 2 | 3 | 4 | 5 {
  return n === 2 || n === 3 || n === 4 || n === 5 ? n : 1;
}

export function emptyBestRecommendationWizardDraft(
  mode: BestRecommendationWizardMode
): BestRecommendationWizardStore {
  return {
    v: 1,
    mode,
    submitted: false,
    draft: {
      v: 7,
      activeStep: 1,
      step1: mergeDraftWithDefaults(null),
      step2: emptyStep2(),
      step3: emptyStep3(),
      step4: emptyStep4()
    }
  };
}

function normalizeLoadedStore(
  parsed: unknown
): BestRecommendationWizardStore | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  if (o.v !== 1) return null;
  const draft = o.draft;
  if (!draft || typeof draft !== 'object') return null;
  const d = draft as Record<string, unknown>;
  const step1 =
    d.step1 && typeof d.step1 === 'object'
      ? mergeDraftWithDefaults(d.step1 as Partial<OnboardingFormValues>)
      : mergeDraftWithDefaults(null);
  const step2 =
    d.step2 && typeof d.step2 === 'object'
      ? (d.step2 as Record<string, unknown>)
      : {};
  const step3 =
    d.step3 && typeof d.step3 === 'object'
      ? (d.step3 as Record<string, unknown>)
      : {};
  const step4 =
    d.step4 && typeof d.step4 === 'object'
      ? (d.step4 as Record<string, unknown>)
      : {};

  return {
    v: 1,
    mode: o.mode === 'signed-in' ? 'signed-in' : 'guest',
    submitted: o.submitted === true,
    draft: {
      v: 7,
      activeStep: normalizeActiveStep(d.activeStep),
      step1,
      step2: {
        firstName: typeof step2.firstName === 'string' ? step2.firstName : '',
        lastName: typeof step2.lastName === 'string' ? step2.lastName : '',
        email: typeof step2.email === 'string' ? step2.email : ''
      },
      step3: {
        gpa: typeof step3.gpa === 'string' ? step3.gpa : ''
      },
      step4: {
        state: typeof step4.state === 'string' ? step4.state : ''
      }
    }
  };
}

export function loadBestRecommendationWizardDraft(): BestRecommendationWizardStore | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BEST_RECOMMENDATION_WIZARD_DRAFT_KEY);
    if (!raw) return null;
    return normalizeLoadedStore(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeStore(store: BestRecommendationWizardStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      BEST_RECOMMENDATION_WIZARD_DRAFT_KEY,
      JSON.stringify(store)
    );
  } catch {
    /* quota */
  }
}

export function saveBestRecommendationWizardDraft(
  store: BestRecommendationWizardStore
): void {
  writeStore(store);
}

export function clearBestRecommendationWizardDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BEST_RECOMMENDATION_WIZARD_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function bestRecommendationWizardHasUsableData(
  store: BestRecommendationWizardStore | null
): boolean {
  const draft = store?.draft;
  if (!draft) return false;
  if (
    draft.step1.schoolLevel.trim() ||
    draft.step1.fieldOfStudy.trim() ||
    draft.step1.citizenship.trim()
  ) {
    return true;
  }
  if (draft.step3.gpa.trim()) return true;
  if (draft.step4.state.trim()) return true;
  return false;
}

export function buildBestRecommendationWizardSeed(
  store: BestRecommendationWizardStore | null
): ScholarshipProfileFilterSeed | null {
  if (!store?.submitted) return null;
  return buildScholarshipProfileFilterSeedFromDraftWithoutBirth(store.draft);
}

export function isBestRecommendationWizardDraftComplete(
  store: BestRecommendationWizardStore | null
): boolean {
  if (!store) return false;
  if (!validateScholarshipOnboardingBasicsWithoutBirth(store.draft.step1).ok) {
    return false;
  }
  if (!validateScholarshipOnboardingStep3Gpa(store.draft.step3).ok) {
    return false;
  }
  const trimmedState = store.draft.step4.state.trim();
  if (trimmedState && !normalizeUsStateToCanonical(trimmedState)) {
    return false;
  }
  return true;
}

function preferNonEmpty(nextValue: string, currentValue: string): string {
  const nextTrimmed = nextValue?.trim() ?? '';
  if (nextTrimmed) return nextTrimmed;
  return currentValue?.trim() ?? '';
}

export function bridgeBestRecommendationWizardToOnboardingDraft(
  store: BestRecommendationWizardStore | null
): boolean {
  if (!store || !bestRecommendationWizardHasUsableData(store)) return false;
  const base = loadStoredOnboardingDraft();
  const merged: StoredOnboardingDraft = {
    v: 7,
    activeStep: 1,
    step1: {
      birthMonth: base?.step1.birthMonth ?? '',
      birthDay: base?.step1.birthDay ?? '',
      birthYear: base?.step1.birthYear ?? '',
      schoolLevel: preferNonEmpty(
        store.draft.step1.schoolLevel,
        base?.step1.schoolLevel ?? ''
      ),
      fieldOfStudy: preferNonEmpty(
        store.draft.step1.fieldOfStudy,
        base?.step1.fieldOfStudy ?? ''
      ),
      citizenship: preferNonEmpty(
        store.draft.step1.citizenship,
        base?.step1.citizenship ?? ''
      )
    },
    step2: base?.step2 ?? emptyStep2(),
    step3: {
      gpa: preferNonEmpty(store.draft.step3.gpa, base?.step3.gpa ?? '')
    },
    step4: {
      state: preferNonEmpty(store.draft.step4.state, base?.step4.state ?? '')
    }
  };
  saveFullOnboardingDraft(merged);
  return true;
}
