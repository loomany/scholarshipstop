/**
 * When a guest fills the `/get-scholarships` quiz, data lives in a separate
 * localStorage key. On account creation (`/onboarding`), merge it into the
 * main onboarding draft so they add DOB (account step) and account fields when missing.
 *
 * After a completed quiz we also stash a sessionStorage snapshot before
 * clearing the landing draft (hub redirect), so browsing still allows merge.
 */

import {
  clearLandingQuizDraft,
  loadCompletedLandingQuizDraft,
  loadLandingQuizSelectedCountry,
  loadLandingQuizDraft
} from '@/lib/onboarding/getScholarshipsLandingDraft';
import {
  loadStoredOnboardingDraft,
  mergeDraftWithDefaults,
  saveFullOnboardingDraft,
  type OnboardingFormValues,
  type StoredOnboardingDraft
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import type { OnboardingStep } from '@/lib/onboarding/onboardingFlowTypes';
import { normalizeCountryCode } from '@/lib/scholarships/countryEligibility/countries';
import {
  buildScholarshipProfileFilterSeedFromDraftWithoutBirth,
  buildScholarshipProfileFilterSeedFromQuizDraft,
  type ScholarshipProfileFilterSeed
} from '@/lib/scholarships/profileFilterDefaults';

/** sessionStorage: full quiz draft after “finish” before landing key is cleared. */
export const PENDING_ONBOARDING_FROM_LANDING_SESSION_KEY =
  'scholarship_pending_onboarding_from_landing_v1';
export const PENDING_ONBOARDING_FROM_LANDING_LOCAL_KEY =
  'scholarship_pending_onboarding_from_landing_local_v1';

function preferNonEmpty(landingVal: string, baseVal: string): string {
  const l = landingVal?.trim() ?? '';
  if (l) return l;
  return baseVal?.trim() ?? '';
}

function emptyBase(): StoredOnboardingDraft {
  return {
    v: 8,
    activeStep: 1,
    preferredHostCountryCodes: [],
    includeUnspecifiedApplicantCountries: false,
    landingDestinationScreenCompleted: true,
    step1: mergeDraftWithDefaults(null),
    step2: { firstName: '', lastName: '', email: '' },
    step3: { gpa: '' },
    step4: { state: '' }
  };
}

export function hasUsableLandingQuizData(landing: StoredOnboardingDraft): boolean {
  if (landing.includeUnspecifiedApplicantCountries === true) {
    return true;
  }
  const s1 = landing.step1;
  if (s1.schoolLevel?.trim() || s1.fieldOfStudy?.trim() || s1.citizenship?.trim()) {
    return true;
  }
  if (
    Array.isArray(landing.preferredHostCountryCodes) &&
    landing.preferredHostCountryCodes.length > 0
  ) {
    return true;
  }
  if (landing.step3.gpa?.trim()) return true;
  if (landing.step4.state?.trim()) return true;
  return false;
}

function mergePreferredHostQuizFields(
  a: string[] | undefined,
  b: string[] | undefined
): string[] {
  const out = new Set([
    ...(a ?? [])
      .map((c) => c.trim().toUpperCase())
      .filter((c) => /^[A-Z]{2}$/.test(c)),
    ...(b ?? [])
      .map((c) => c.trim().toUpperCase())
      .filter((c) => /^[A-Z]{2}$/.test(c))
  ]);
  return [...out].sort((x, y) => x.localeCompare(y));
}

function parseSessionDraft(raw: string): StoredOnboardingDraft | null {
  try {
    const parsed = JSON.parse(raw) as StoredOnboardingDraft;
    const dv = (parsed as unknown as { v?: unknown }).v;
    const major = typeof dv === 'number' ? dv : 0;
    if (!parsed || (major !== 7 && major !== 8) || typeof parsed.step1 !== 'object')
      return null;
    return parsed;
  } catch {
    return null;
  }
}

function readPendingLandingDraftFromStorage(): StoredOnboardingDraft | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawSession = sessionStorage.getItem(PENDING_ONBOARDING_FROM_LANDING_SESSION_KEY);
    if (rawSession) {
      const parsed = parseSessionDraft(rawSession);
      if (parsed) return parsed;
    }
  } catch (error) {
    console.warn('[landing-merge] session read failed', error);
  }

  try {
    const rawLocal = localStorage.getItem(PENDING_ONBOARDING_FROM_LANDING_LOCAL_KEY);
    if (rawLocal) {
      const parsed = parseSessionDraft(rawLocal);
      if (parsed) return parsed;
    }
  } catch (error) {
    console.warn('[landing-merge] local read failed', error);
  }

  return null;
}

function clearPendingLandingDraftFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PENDING_ONBOARDING_FROM_LANDING_SESSION_KEY);
  } catch (error) {
    console.warn('[landing-merge] session clear failed', error);
  }
  try {
    localStorage.removeItem(PENDING_ONBOARDING_FROM_LANDING_LOCAL_KEY);
  } catch (error) {
    console.warn('[landing-merge] local clear failed', error);
  }
}

/**
 * Best recommendation “Edit answers” for guests who only have `/get-scholarships` (or pending session)
 * data — not necessarily `scholarship_best_recommendation_wizard_draft_v1`.
 */
export function loadGuestLandingQuizDraftForHubReEdit(): StoredOnboardingDraft | null {
  if (typeof window === 'undefined') return null;

  const completed = loadCompletedLandingQuizDraft();
  if (completed && hasUsableLandingQuizData(completed)) return completed;

  const pending = readPendingLandingDraftFromStorage();
  if (pending && hasUsableLandingQuizData(pending)) return pending;

  const live = loadLandingQuizDraft();
  if (live && hasUsableLandingQuizData(live)) return live;

  return null;
}

/**
 * Call when the user finishes the landing quiz, before `clearLandingQuizDraft()`.
 */
export function stashLandingQuizDraftForOnboardingMerge(
  draft: StoredOnboardingDraft
): void {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(draft);
  try {
    sessionStorage.setItem(PENDING_ONBOARDING_FROM_LANDING_SESSION_KEY, serialized);
  } catch (error) {
    console.warn('[landing-merge] session stash failed', error);
  }
  try {
    localStorage.setItem(PENDING_ONBOARDING_FROM_LANDING_LOCAL_KEY, serialized);
  } catch (error) {
    console.warn('[landing-merge] local stash failed', error);
  }
}

/**
 * Rebuild the hub filter seed after refresh: `LANDING_QUIZ_HUB_SEED_KEY` is one-shot removed on
 * first hub load, but `PENDING_ONBOARDING_FROM_LANDING_SESSION_KEY` stays until `/onboarding` merge.
 */
export function tryBuildProfileSeedFromPendingLandingSession(): ScholarshipProfileFilterSeed | null {
  const draft = readPendingLandingDraftFromStorage();
  if (!draft) return null;
  const seed =
    buildScholarshipProfileFilterSeedFromQuizDraft(draft) ??
    buildScholarshipProfileFilterSeedFromDraftWithoutBirth(draft);
  return withSelectedCountrySeed(seed);
}

export function tryBuildProfileSeedFromCompletedLandingQuiz(): ScholarshipProfileFilterSeed | null {
  if (typeof window === 'undefined') return null;
  try {
    const draft = loadCompletedLandingQuizDraft();
    if (!draft) return null;
    return withSelectedCountrySeed(
      buildScholarshipProfileFilterSeedFromDraftWithoutBirth(draft)
    );
  } catch {
    return null;
  }
}

function withSelectedCountrySeed(
  seed: ScholarshipProfileFilterSeed | null
): ScholarshipProfileFilterSeed | null {
  if (!seed) return null;
  if (seed.includeUnspecifiedApplicantCountries === true) {
    return {
      ...seed,
      applicantCountryCodes: [],
      includeUnspecifiedApplicantCountries: true
    };
  }
  const countryCode = loadLandingQuizSelectedCountry();
  if (!/^[A-Z]{2}$/.test(countryCode)) return seed;
  return {
    ...seed,
    applicantCountryCodes: [countryCode],
    includeUnspecifiedApplicantCountries: false
  };
}

function stripQuizVariant(d: StoredOnboardingDraft): StoredOnboardingDraft {
  const copy: StoredOnboardingDraft = { ...d, v: 8 };
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

  /** Landing/completed quiz source wins over an older onboarding base. */
  const mergedUnspecified = source.includeUnspecifiedApplicantCountries === true;
  const mergedCountryCode = mergedUnspecified
    ? ''
    : preferNonEmpty(
        typeof source.step4.countryCode === 'string' ? source.step4.countryCode : '',
        typeof b.step4.countryCode === 'string' ? b.step4.countryCode : ''
      );

  return {
    v: 8,
    preferredHostCountryCodes: mergePreferredHostQuizFields(
      source.preferredHostCountryCodes,
      b.preferredHostCountryCodes
    ),
    includeUnspecifiedApplicantCountries: mergedUnspecified,
    activeStep: b.activeStep,
    step1,
    step2: { ...b.step2 },
    step3: {
      gpa: preferNonEmpty(source.step3.gpa, b.step3.gpa)
    },
    step4: {
      countryCode: mergedCountryCode,
      state: preferNonEmpty(source.step4.state, b.step4.state)
    }
  };
}

/** Country-first `/onboarding`: step 1 = country, step 2 = account (DOB + signup fields). */
export function computeResumeStepAfterLandingMerge(
  d: StoredOnboardingDraft
): OnboardingStep {
  if (d.includeUnspecifiedApplicantCountries === true) return 2;
  const countryCode = normalizeCountryCode(d.step4.countryCode);
  if (!countryCode) return 1;
  return 2;
}

/**
 * Merges session snapshot (post-quiz) or landing localStorage draft into the main
 * onboarding draft. Clears sources after success. Returns the merged draft, or null.
 */
export function applyPendingLandingQuizMergeIfNeeded(): StoredOnboardingDraft | null {
  if (typeof window === 'undefined') return null;

  const pendingDraft = readPendingLandingDraftFromStorage();
  const landingDraft = loadLandingQuizDraft();
  const completedDraft = loadCompletedLandingQuizDraft();
  let sourceType: 'pending' | 'landing' | 'completed' | null = null;
  const source =
    pendingDraft
      ? ((sourceType = 'pending'), pendingDraft)
      : landingDraft && hasUsableLandingQuizData(landingDraft)
        ? ((sourceType = 'landing'), landingDraft)
        : completedDraft && hasUsableLandingQuizData(completedDraft)
          ? ((sourceType = 'completed'), completedDraft)
          : null;

  if (!source) return null;

  const base = loadStoredOnboardingDraft();
  const merged = mergeSourceIntoBase(source, base);
  const next: StoredOnboardingDraft = {
    ...merged,
    activeStep: computeResumeStepAfterLandingMerge(merged)
  };

  saveFullOnboardingDraft(next);
  clearPendingLandingDraftFromStorage();
  clearLandingQuizDraft();
  console.info('[landing-merge] merged quiz draft into onboarding', { sourceType });

  return next;
}
