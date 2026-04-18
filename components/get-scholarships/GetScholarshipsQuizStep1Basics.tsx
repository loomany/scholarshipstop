'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent
} from 'react';
import { DarkSelect } from '@/components/home/DarkSelect';
import { CITIZENSHIP_OPTIONS } from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  FIELD_OF_STUDY_OPTIONS,
  SCHOOL_LEVEL_OPTIONS
} from '@/lib/constants/scholarshipProfileOptions';
import {
  loadLandingQuizDraft,
  mergeAndSaveStep1LandingForm
} from '@/lib/onboarding/getScholarshipsLandingDraft';
import {
  mergeDraftWithDefaults,
  type OnboardingFormValues
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';
import { validateScholarshipOnboardingBasicsWithoutBirth } from '@/lib/validation/scholarshipOnboardingSchema';

const schoolLevelSelectOptions = [
  { value: '', label: 'Select your school level' },
  ...SCHOOL_LEVEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
];

const fieldOfStudySelectOptions = [
  { value: '', label: 'Select your field of study' },
  ...FIELD_OF_STUDY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
];

const citizenshipSelectOptions = [
  { value: '', label: 'Select citizenship status' },
  ...CITIZENSHIP_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
];

const fieldHintClass = 'mt-1 text-sm text-zinc-600';

const sectionLabelClass =
  'mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-gray-700';

type Props = {
  disabled?: boolean;
  initialStep1: OnboardingFormValues;
  onContinue: (values: OnboardingFormValues) => void;
};

export function GetScholarshipsQuizStep1Basics({
  disabled = false,
  initialStep1,
  onContinue
}: Props) {
  const [values, setValues] = useState<OnboardingFormValues>(() => ({
    ...mergeDraftWithDefaults(null),
    ...initialStep1
  }));
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      mergeAndSaveStep1LandingForm(values, loadLandingQuizDraft());
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [values]);

  const [errors, setErrors] = useState<
    Partial<Record<keyof OnboardingFormValues | 'birthDate' | 'age', string>>
  >({});

  const setField = useCallback(
    <K extends keyof OnboardingFormValues>(key: K, v: OnboardingFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: v }));
      setErrors((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    },
    []
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateScholarshipOnboardingBasicsWithoutBirth(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    mergeAndSaveStep1LandingForm(values, loadLandingQuizDraft());
    onContinue(values);
  };

  return (
    <form
      id="get-scholarships-quiz-step1-form"
      onSubmit={handleSubmit}
      className="w-full space-y-6"
      noValidate
    >
      <div className="mx-auto max-w-lg text-center">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
          Step 1 of 3 · Basics
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Tell us about you
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base font-medium leading-7 text-zinc-600 sm:max-w-lg">
          We use this to match scholarships to your background and goals.
        </p>
        <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-zinc-500 sm:max-w-lg">
          The more details you share, the better we can tailor scholarship matches
          to you.
        </p>
      </div>

      <div className="space-y-5 text-left">
        <div>
          <label htmlFor="gsq-school-level" className={sectionLabelClass}>
            Current school level
          </label>
          <DarkSelect
            id="gsq-school-level"
            options={schoolLevelSelectOptions}
            value={values.schoolLevel}
            onChange={(v) => setField('schoolLevel', v)}
            disabled={disabled}
            hasError={Boolean(errors.schoolLevel)}
          />
          {errors.schoolLevel ? (
            <p className={fieldHintClass}>{errors.schoolLevel}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="gsq-field-of-study" className={sectionLabelClass}>
            Field of study
          </label>
          <DarkSelect
            id="gsq-field-of-study"
            options={fieldOfStudySelectOptions}
            value={values.fieldOfStudy}
            onChange={(v) => setField('fieldOfStudy', v)}
            disabled={disabled}
            hasError={Boolean(errors.fieldOfStudy)}
            menuClassName="max-h-72"
          />
          {errors.fieldOfStudy ? (
            <p className={fieldHintClass}>{errors.fieldOfStudy}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="gsq-citizenship" className={sectionLabelClass}>
            Citizenship status
          </label>
          <DarkSelect
            id="gsq-citizenship"
            ariaLabel="Citizenship status"
            options={citizenshipSelectOptions}
            value={values.citizenship}
            onChange={(v) => setField('citizenship', v)}
            disabled={disabled}
            hasError={Boolean(errors.citizenship)}
          />
          {errors.citizenship ? (
            <p className={fieldHintClass}>{errors.citizenship}</p>
          ) : null}
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled}
        className={ONBOARDING_PRIMARY_BUTTON_CLASS}
      >
        Continue →
      </button>
    </form>
  );
}
