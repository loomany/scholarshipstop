'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { DarkSelect } from '@/components/home/DarkSelect';
import { CITIZENSHIP_OPTIONS } from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  FIELD_OF_STUDY_OPTIONS,
  SCHOOL_LEVEL_OPTIONS
} from '@/lib/constants/scholarshipProfileOptions';
import {
  loadStoredOnboardingDraft,
  mergeAndSaveStep1Form,
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

export type ScholarshipOnboardingStep1Props = {
  disabled?: boolean;
  initialStep1: OnboardingFormValues;
  basicStep?: 'schoolLevel' | 'fieldOfStudy' | 'citizenship';
  progressEyebrow?: string;
  title?: string;
  description?: string;
  helperText?: string;
  onBack?: () => void;
  onContinue: (values: OnboardingFormValues) => void;
};

export function ScholarshipOnboardingStep1({
  disabled = false,
  initialStep1,
  basicStep = 'schoolLevel',
  progressEyebrow,
  title,
  description,
  helperText,
  onBack,
  onContinue
}: ScholarshipOnboardingStep1Props) {
  const [values, setValues] = useState<OnboardingFormValues>(() => ({
    ...mergeDraftWithDefaults(null),
    ...initialStep1
  }));
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      mergeAndSaveStep1Form(values, loadStoredOnboardingDraft());
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
    const validation = validateScholarshipOnboardingBasicsWithoutBirth(values);
    const nextErrors: Partial<
      Record<keyof OnboardingFormValues | 'birthDate' | 'age', string>
    > = {};
    if (!validation.ok) {
      const fieldError = validation.errors[basicStep];
      if (fieldError) nextErrors[basicStep] = fieldError;
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    mergeAndSaveStep1Form(values, loadStoredOnboardingDraft());
    onContinue(values);
  };

  const fieldConfig =
    basicStep === 'schoolLevel'
      ? {
          selectId: 'onb-school-level',
          label: 'Current school level',
          options: schoolLevelSelectOptions,
          value: values.schoolLevel,
          error: errors.schoolLevel,
          onChange: (v: string) => setField('schoolLevel', v),
          menuClassName: undefined as string | undefined
        }
      : basicStep === 'fieldOfStudy'
        ? {
            selectId: 'onb-field-of-study',
            label: 'Field of study',
            options: fieldOfStudySelectOptions,
            value: values.fieldOfStudy,
            error: errors.fieldOfStudy,
            onChange: (v: string) => setField('fieldOfStudy', v),
            menuClassName: 'max-h-72'
          }
        : {
            selectId: 'onb-citizenship',
            label: 'Citizenship status',
            options: citizenshipSelectOptions,
            value: values.citizenship,
            error: errors.citizenship,
            onChange: (v: string) => setField('citizenship', v),
            menuClassName: undefined as string | undefined
          };

  return (
    <form
      id="onboarding-step1-form"
      onSubmit={handleSubmit}
      className="w-full space-y-6"
      noValidate
    >
      {typeof onBack === 'function' ? (
        <button
          type="button"
          onClick={onBack}
          disabled={disabled}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
        >
          ← Back
        </button>
      ) : null}

      <div className="mx-auto max-w-lg text-center">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
          {progressEyebrow ?? 'Step 1 of 6 · Basics'}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {title ?? 'Tell us about you'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base font-medium leading-7 text-zinc-600 sm:max-w-lg">
          {description ?? 'We use this to match scholarships to your background and goals.'}
        </p>
        <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-zinc-500 sm:max-w-lg">
          {helperText ??
            'The more details you share, the better we can tailor scholarship matches to you.'}
        </p>
      </div>

      <div className="space-y-5 text-left">
        <div>
          <label htmlFor={fieldConfig.selectId} className={sectionLabelClass}>
            {fieldConfig.label}
          </label>
          <DarkSelect
            id={fieldConfig.selectId}
            ariaLabel={fieldConfig.label}
            options={fieldConfig.options}
            value={fieldConfig.value}
            onChange={fieldConfig.onChange}
            disabled={disabled}
            hasError={Boolean(fieldConfig.error)}
            menuClassName={fieldConfig.menuClassName}
          />
          {fieldConfig.error ? <p className={fieldHintClass}>{fieldConfig.error}</p> : null}
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
