import { migrateLegacyGpaDraftValue } from '@/lib/constants/scholarshipGpaOptions';
import type {
  OnboardingStep,
  OnboardingStep2DraftFields,
  OnboardingStep3DraftFields,
  OnboardingStep4DraftFields
} from '@/lib/onboarding/onboardingFlowTypes';

export type {
  OnboardingStep2DraftFields,
  OnboardingStep3DraftFields,
  OnboardingStep4DraftFields
};

export const SCHOLARSHIP_ONBOARDING_DRAFT_KEY = 'scholarship_onboarding_draft_v2';

export type OnboardingFormValues = {
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  schoolLevel: string;
  fieldOfStudy: string;
  citizenship: string;
};

export type StoredOnboardingDraft = {
  v: 7;
  /**
   * `/get-scholarships` quiz: step 1 omits birthday; profile stores null DOB.
   * Does not use the main `scholarship_onboarding_draft_v2` key.
   */
  quizVariant?: 'landing_no_birth';
  activeStep: OnboardingStep;
  step1: OnboardingFormValues;
  step2: OnboardingStep2DraftFields;
  step3: OnboardingStep3DraftFields;
  step4: OnboardingStep4DraftFields;
};

const emptyStep1 = (): OnboardingFormValues => ({
  birthMonth: '',
  birthDay: '',
  birthYear: '',
  schoolLevel: '',
  fieldOfStudy: '',
  citizenship: ''
});

const emptyStep2 = (): OnboardingStep2DraftFields => ({
  firstName: '',
  lastName: '',
  email: ''
});

const emptyStep3 = (): OnboardingStep3DraftFields => ({
  gpa: ''
});

const emptyStep4 = (): OnboardingStep4DraftFields => ({
  state: ''
});

function defaultStored(): StoredOnboardingDraft {
  return {
    v: 7,
    activeStep: 1,
    step1: emptyStep1(),
    step2: emptyStep2(),
    step3: emptyStep3(),
    step4: emptyStep4()
  };
}

function normalizeActiveStep(n: unknown): OnboardingStep {
  if (n === 2 || n === 3 || n === 4 || n === 5 || n === 6 || n === 7) return n;
  return 1;
}

/**
 * Migrate v2–v7: location (old step3 country/state/city) dropped.
 * GPA lives in step3; legacy step4.gpa merged into step3.
 * v7 adds step4 US state (optional).
 */
function parseStored(raw: string): StoredOnboardingDraft | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;

    const version = o.v;
    const hasStructuredSteps =
      (version === 2 ||
        version === 3 ||
        version === 4 ||
        version === 5 ||
        version === 6 ||
        version === 7) &&
      o.step1 &&
      typeof o.step1 === 'object';

    if (hasStructuredSteps) {
      const s1 = o.step1 as Record<string, unknown>;
      const s2 =
        o.step2 && typeof o.step2 === 'object'
          ? (o.step2 as Record<string, unknown>)
          : {};
      const s3 =
        o.step3 && typeof o.step3 === 'object'
          ? (o.step3 as Record<string, unknown>)
          : {};
      const s4 =
        o.step4 && typeof o.step4 === 'object'
          ? (o.step4 as Record<string, unknown>)
          : {};

      const citizenshipFromS1 =
        typeof s1.citizenship === 'string' ? s1.citizenship : '';
      const citizenshipFromS3 =
        typeof s3.citizenship === 'string' ? s3.citizenship : '';
      const citizenship = citizenshipFromS1 || citizenshipFromS3;

      let fieldFromS1 =
        typeof s1.fieldOfStudy === 'string' ? s1.fieldOfStudy : '';
      const fieldFromS4 =
        typeof s4.fieldOfStudy === 'string' ? s4.fieldOfStudy : '';
      const fieldOfStudy = fieldFromS1 || fieldFromS4;

      const gpaFromS3 =
        typeof s3.gpa === 'string' ? s3.gpa : '';
      const gpaFromS4 =
        typeof s4.gpa === 'string' ? s4.gpa : '';
      const gpa = migrateLegacyGpaDraftValue(gpaFromS3 || gpaFromS4);

      let activeStep = normalizeActiveStep(o.activeStep);
      const s4next =
        o.step4 && typeof o.step4 === 'object'
          ? (o.step4 as Record<string, unknown>)
          : {};
      const stateFromStep4 =
        version === 7 && typeof s4next.state === 'string'
          ? s4next.state
          : '';
      if (version === 6 && activeStep > 3) {
        activeStep = 3;
      }

      const quizVariant =
        o.quizVariant === 'landing_no_birth' ? ('landing_no_birth' as const) : undefined;

      return {
        v: 7,
        quizVariant,
        activeStep,
        step1: {
          birthMonth: typeof s1.birthMonth === 'string' ? s1.birthMonth : '',
          birthDay: typeof s1.birthDay === 'string' ? s1.birthDay : '',
          birthYear: typeof s1.birthYear === 'string' ? s1.birthYear : '',
          schoolLevel:
            typeof s1.schoolLevel === 'string' ? s1.schoolLevel : '',
          fieldOfStudy,
          citizenship
        },
        step2: {
          firstName: typeof s2.firstName === 'string' ? s2.firstName : '',
          lastName: typeof s2.lastName === 'string' ? s2.lastName : '',
          email: typeof s2.email === 'string' ? s2.email : ''
        },
        step3: { gpa },
        step4: { state: stateFromStep4 }
      };
    }

    const out: Partial<OnboardingFormValues> = {};
    let legacyField = '';
    let legacyCitizenship = '';
    if (typeof o.birthMonth === 'string') out.birthMonth = o.birthMonth;
    if (typeof o.birthDay === 'string') out.birthDay = o.birthDay;
    if (typeof o.birthYear === 'string') out.birthYear = o.birthYear;
    if (typeof o.schoolLevel === 'string') out.schoolLevel = o.schoolLevel;
    if (typeof o.fieldOfStudy === 'string') legacyField = o.fieldOfStudy;
    if (typeof o.citizenship === 'string') legacyCitizenship = o.citizenship;
    if (Object.keys(out).length === 0 && !legacyField && !legacyCitizenship)
      return null;
    return {
      v: 7,
      activeStep: 1,
      step1: {
        ...emptyStep1(),
        ...out,
        fieldOfStudy: legacyField,
        citizenship: legacyCitizenship
      },
      step2: emptyStep2(),
      step3: emptyStep3(),
      step4: emptyStep4()
    };
  } catch {
    return null;
  }
}

export function loadStoredOnboardingDraft(): StoredOnboardingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SCHOLARSHIP_ONBOARDING_DRAFT_KEY);
    if (!raw) return null;
    return parseStored(raw);
  } catch {
    return null;
  }
}

function writeStored(draft: StoredOnboardingDraft): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCHOLARSHIP_ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* quota */
  }
}

export function saveFullOnboardingDraft(draft: StoredOnboardingDraft): void {
  writeStored(draft);
}

export function mergeAndSaveStep1Form(
  values: OnboardingFormValues,
  base: StoredOnboardingDraft | null
): void {
  const prev = base ?? defaultStored();
  writeStored({
    ...prev,
    step1: { ...values }
  });
}

export function saveStep2DraftFields(
  step2: OnboardingStep2DraftFields,
  base: StoredOnboardingDraft | null
): void {
  const prev = base ?? defaultStored();
  writeStored({
    ...prev,
    step2: { ...step2 }
  });
}

export function saveStep3DraftFields(
  step3: OnboardingStep3DraftFields,
  base: StoredOnboardingDraft | null
): void {
  const prev = base ?? defaultStored();
  writeStored({
    ...prev,
    step3: { ...step3 }
  });
}

export function saveStep4DraftFields(
  step4: OnboardingStep4DraftFields,
  base: StoredOnboardingDraft | null
): void {
  const prev = base ?? defaultStored();
  writeStored({
    ...prev,
    step4: { ...step4 }
  });
}

export function setDraftActiveStep(
  step: OnboardingStep,
  base: StoredOnboardingDraft | null
): void {
  const prev = base ?? defaultStored();
  writeStored({ ...prev, activeStep: step });
}

export function clearScholarshipOnboardingDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SCHOLARSHIP_ONBOARDING_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function mergeDraftWithDefaults(
  partial: Partial<OnboardingFormValues> | null
): OnboardingFormValues {
  const base = emptyStep1();
  if (!partial) return base;
  return {
    birthMonth:
      typeof partial.birthMonth === 'string' ? partial.birthMonth : base.birthMonth,
    birthDay:
      typeof partial.birthDay === 'string' ? partial.birthDay : base.birthDay,
    birthYear:
      typeof partial.birthYear === 'string' ? partial.birthYear : base.birthYear,
    schoolLevel:
      typeof partial.schoolLevel === 'string'
        ? partial.schoolLevel
        : base.schoolLevel,
    fieldOfStudy:
      typeof partial.fieldOfStudy === 'string'
        ? partial.fieldOfStudy
        : base.fieldOfStudy,
    citizenship:
      typeof partial.citizenship === 'string'
        ? partial.citizenship
        : base.citizenship
  };
}

/** @deprecated use mergeAndSaveStep1Form + loadStoredOnboardingDraft */
export function saveScholarshipOnboardingFormDraft(values: OnboardingFormValues): void {
  const loaded = loadStoredOnboardingDraft();
  mergeAndSaveStep1Form(values, loaded);
}

/** @deprecated use loadStoredOnboardingDraft */
export function loadScholarshipOnboardingDraft(): Partial<OnboardingFormValues> | null {
  const s = loadStoredOnboardingDraft();
  if (!s) return null;
  return s.step1;
}
