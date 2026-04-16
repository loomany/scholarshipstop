'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent
} from 'react';
import { DarkSelect } from '@/components/home/DarkSelect';
import { SITE_INPUT_FOCUS_CLASS } from '@/lib/constants/siteInputFocus';
import { CITIZENSHIP_OPTIONS } from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  buildBirthMonthSelectOptions,
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
import { validateScholarshipOnboarding } from '@/lib/validation/scholarshipOnboardingSchema';
import {
  sanitizeBirthDayInput,
  sanitizeBirthYearInput,
  validateBirthDateFields
} from '@/lib/validation/birthDateFields';

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

const birthMonthOptions = buildBirthMonthSelectOptions();

const fieldHintClass = 'mt-1 text-sm text-zinc-600';
const datePartInputBaseClass = `w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm outline-none transition-all duration-200 placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 ${SITE_INPUT_FOCUS_CLASS}`;

const sectionLabelClass =
  'mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-gray-700';

export type ScholarshipOnboardingStep1Props = {
  disabled?: boolean;
  initialStep1: OnboardingFormValues;
  onContinue: (values: OnboardingFormValues) => void;
};

export function ScholarshipOnboardingStep1({
  disabled = false,
  initialStep1,
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
  const liveBirthErrors = useMemo(
    () => validateBirthDateFields(values, { requireAll: false }),
    [values]
  );
  const birthMonthError = errors.birthMonth ?? liveBirthErrors.birthMonth;
  const birthDayError = errors.birthDay ?? liveBirthErrors.birthDay;
  const birthYearError = errors.birthYear ?? liveBirthErrors.birthYear;
  const birthDateError = errors.birthDate ?? liveBirthErrors.birthDate;
  const birthAgeError = errors.age ?? liveBirthErrors.age;

  const setField = useCallback(
    <K extends keyof OnboardingFormValues>(key: K, v: OnboardingFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: v }));
      setErrors((e) => {
        const next = { ...e };
        delete next[key];
        if (key === 'birthMonth' || key === 'birthDay' || key === 'birthYear') {
          delete next.birthDate;
          delete next.age;
        }
        return next;
      });
    },
    []
  );

  const handleBirthDayChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setField('birthDay', sanitizeBirthDayInput(e.target.value));
    },
    [setField]
  );

  const handleBirthYearChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setField('birthYear', sanitizeBirthYearInput(e.target.value));
    },
    [setField]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateScholarshipOnboarding(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    mergeAndSaveStep1Form(values, loadStoredOnboardingDraft());
    onContinue(values);
  };

  return (
    <form
      id="onboarding-step1-form"
      onSubmit={handleSubmit}
      className="w-full space-y-6"
      noValidate
    >
      <div className="mx-auto max-w-lg text-center">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
          Step 1 of 4 · Basics
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
          <p className={sectionLabelClass}>Birthday</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3">
            <div>
              <DarkSelect
                ariaLabel="Birth month"
                options={birthMonthOptions}
                value={values.birthMonth}
                onChange={(v) => setField('birthMonth', v)}
                disabled={disabled}
                hasError={Boolean(birthMonthError)}
              />
              {birthMonthError ? (
                <p className={fieldHintClass}>{birthMonthError}</p>
              ) : null}
            </div>
            <div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="Birth day"
                value={values.birthDay}
                onChange={handleBirthDayChange}
                disabled={disabled}
                placeholder="Day"
                maxLength={2}
                className={`${datePartInputBaseClass} ${
                  birthDayError
                    ? 'border-amber-400/80 hover:border-amber-500/70'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
                aria-invalid={Boolean(birthDayError)}
              />
              {birthDayError ? (
                <p className={fieldHintClass}>{birthDayError}</p>
              ) : null}
            </div>
            <div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="Birth year"
                value={values.birthYear}
                onChange={handleBirthYearChange}
                disabled={disabled}
                placeholder="Year"
                maxLength={4}
                className={`${datePartInputBaseClass} ${
                  birthYearError
                    ? 'border-amber-400/80 hover:border-amber-500/70'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
                aria-invalid={Boolean(birthYearError)}
              />
              {birthYearError ? (
                <p className={fieldHintClass}>{birthYearError}</p>
              ) : null}
            </div>
          </div>
          {birthDateError ? (
            <p className={`${fieldHintClass} mt-2`}>{birthDateError}</p>
          ) : null}
          {birthAgeError ? (
            <p className={`${fieldHintClass} mt-2`}>{birthAgeError}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="onb-school-level" className={sectionLabelClass}>
            Current school level
          </label>
          <DarkSelect
            id="onb-school-level"
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
          <label htmlFor="onb-field-of-study" className={sectionLabelClass}>
            Field of study
          </label>
          <DarkSelect
            id="onb-field-of-study"
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
          <label htmlFor="onb-citizenship" className={sectionLabelClass}>
            Citizenship status
          </label>
          <DarkSelect
            id="onb-citizenship"
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
