'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  loadStoredOnboardingDraft,
  saveStep2DraftFields,
  type OnboardingStep2DraftFields
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';
import {
  validateScholarshipOnboardingStep2,
  type Step2FormValues,
  type Step2FieldErrors
} from '@/lib/validation/scholarshipOnboardingStep2Schema';

const inputClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/25';

const inputErrorClass =
  'w-full rounded-xl border border-amber-400/90 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/25';

const hintClass = 'mt-1 text-sm text-zinc-600';

export type Step2ContinuePayload = Step2FormValues;

type Props = {
  disabled?: boolean;
  initialStep2: OnboardingStep2DraftFields;
  submitError: string | null;
  onBack: () => void;
  /** Saves account draft (no password). Password stays in memory via parent callback only. */
  onContinue: (payload: Step2ContinuePayload) => void;
};

export function ScholarshipOnboardingStep2({
  disabled = false,
  initialStep2,
  submitError,
  onBack,
  onContinue
}: Props) {
  const [values, setValues] = useState<Step2FormValues>(() => ({
    firstName: initialStep2.firstName,
    lastName: initialStep2.lastName,
    email: initialStep2.email,
    password: '',
    confirmPassword: ''
  }));
  const [errors, setErrors] = useState<Step2FieldErrors>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveStep2DraftFields(
        {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email
        },
        loadStoredOnboardingDraft()
      );
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [values.firstName, values.lastName, values.email]);

  const setField = <K extends keyof Step2FormValues>(key: K, v: Step2FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      delete next.submit;
      return next;
    });
  };

  const fieldClass = (key: keyof Step2FormValues) =>
    errors[key] ? inputErrorClass : inputClass;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateScholarshipOnboardingStep2(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    saveStep2DraftFields(
      {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim()
      },
      loadStoredOnboardingDraft()
    );
    onContinue(values);
  };

  return (
    <div className="w-full space-y-6">
      <button
        type="button"
        onClick={onBack}
        disabled={disabled}
        className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
      >
        ← Back
      </button>
      <div className="mx-auto max-w-lg text-center">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
          Step 4 of 4 · Account
        </p>
        <h2
          id="onboarding-step2-title"
          className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl"
        >
          Create your account
        </h2>
        <p className="mx-auto mt-3 flex max-w-md flex-col gap-1 text-base font-medium leading-7 text-zinc-600 sm:max-w-lg">
          <span>
            Your email is used to save your matches and personalize results.
          </span>
          <span>We never sell your data.</span>
        </p>
      </div>

      <form className="space-y-5 text-left" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="onb-first" className="sr-only">
              First name
            </label>
            <input
              id="onb-first"
              type="text"
              autoComplete="given-name"
              value={values.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              placeholder="First name"
              disabled={disabled}
              className={fieldClass('firstName')}
            />
            {errors.firstName ? (
              <p className={hintClass}>{errors.firstName}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="onb-last" className="sr-only">
              Last name
            </label>
            <input
              id="onb-last"
              type="text"
              autoComplete="family-name"
              value={values.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              placeholder="Last name"
              disabled={disabled}
              className={fieldClass('lastName')}
            />
            {errors.lastName ? (
              <p className={hintClass}>{errors.lastName}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="onb-email" className="sr-only">
            Email address
          </label>
          <input
            id="onb-email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="Email address"
            disabled={disabled}
            className={fieldClass('email')}
          />
          {errors.email ? <p className={hintClass}>{errors.email}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="onb-pass" className="sr-only">
              Create password
            </label>
            <input
              id="onb-pass"
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => setField('password', e.target.value)}
              placeholder="Create password"
              disabled={disabled}
              className={fieldClass('password')}
            />
            {errors.password ? (
              <p className={hintClass}>{errors.password}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="onb-pass2" className="sr-only">
              Confirm password
            </label>
            <input
              id="onb-pass2"
              type="password"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={(e) => setField('confirmPassword', e.target.value)}
              placeholder="Confirm password"
              disabled={disabled}
              className={fieldClass('confirmPassword')}
            />
            {errors.confirmPassword ? (
              <p className={hintClass}>{errors.confirmPassword}</p>
            ) : null}
          </div>
        </div>

        {submitError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {submitError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={disabled}
          className={ONBOARDING_PRIMARY_BUTTON_CLASS}
        >
          Create account &amp; find scholarships →
        </button>
      </form>
    </div>
  );
}
