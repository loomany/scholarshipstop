'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { DarkSelect } from '@/components/home/DarkSelect';
import { toast } from '@/components/ui/Toasts/use-toast';
import { buildCompleteScholarshipUserProfile } from '@/lib/onboarding/buildScholarshipUserProfile';
import {
  loadLandingQuizDraft,
  mergeAndSaveStep1LandingForm,
  saveStep2LandingDraftFields
} from '@/lib/onboarding/getScholarshipsLandingDraft';
import {
  loadStoredOnboardingDraft,
  mergeAndSaveStep1Form,
  saveStep2DraftFields,
  type OnboardingFormValues,
  type OnboardingStep2DraftFields
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import { buildBirthMonthSelectOptions } from '@/lib/constants/scholarshipProfileOptions';
import { SITE_INPUT_FOCUS_CLASS } from '@/lib/constants/siteInputFocus';
import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';
import { PASSWORD_POLICY_HINT } from '@/lib/validation/passwordPolicy';
import {
  validateScholarshipOnboardingStep2,
  type Step2FormValues,
  type Step2FieldErrors
} from '@/lib/validation/scholarshipOnboardingStep2Schema';
import {
  sanitizeBirthDayInput,
  sanitizeBirthYearInput,
  validateBirthDateFields
} from '@/lib/validation/birthDateFields';
import { getOAuthCallbackUrlWithNext } from '@/utils/helpers';
import { createClient } from '@/utils/supabase/client';

const birthMonthOptions = buildBirthMonthSelectOptions();

const inputClass = `w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-300 ${SITE_INPUT_FOCUS_CLASS}`;

const inputErrorClass = `w-full rounded-xl border border-amber-400/90 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 ${SITE_INPUT_FOCUS_CLASS}`;

const datePartInputBaseClass = `w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm outline-none transition-all duration-200 placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 ${SITE_INPUT_FOCUS_CLASS}`;

const sectionLabelClass =
  'mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-gray-700';

const hintClass = 'mt-1 text-sm text-zinc-600';

export type Step2ContinuePayload = Step2FormValues;

type Props = {
  disabled?: boolean;
  /** True while parent runs sign-up / finalize (inline button loading, no fullscreen overlay). */
  isSubmitting?: boolean;
  /** Step 1 draft (school / field / citizenship + DOB saved from this screen). */
  initialStep1: OnboardingFormValues;
  initialStep2: OnboardingStep2DraftFields;
  onBack: () => void;
  /** Saves account draft (no password). Password stays in memory via parent callback only. */
  onContinue: (payload: Step2ContinuePayload) => void;
  /**
   * Post-auth path after Google OAuth (matches email signup `afterAuthPath`).
   * Passed as `/auth/callback?next=…` — add the same origin + path in Supabase Auth redirect URLs if needed.
   */
  oauthRedirectAfterAuthPath: string;
  /** `/get-scholarships` quiz uses a separate localStorage draft from `/onboarding`. */
  draftStore?: 'onboarding' | 'landing';
  progressEyebrow?: string;
  visualVariant?: 'default' | 'saas';
};

export function ScholarshipOnboardingStep2({
  disabled = false,
  isSubmitting = false,
  initialStep1,
  initialStep2,
  onBack,
  onContinue,
  oauthRedirectAfterAuthPath,
  draftStore = 'onboarding',
  progressEyebrow,
  visualVariant = 'default'
}: Props) {
  const loadDraft =
    draftStore === 'landing' ? loadLandingQuizDraft : loadStoredOnboardingDraft;
  const saveStep2Fields =
    draftStore === 'landing' ? saveStep2LandingDraftFields : saveStep2DraftFields;
  const saveStep1Birth =
    draftStore === 'landing' ? mergeAndSaveStep1LandingForm : mergeAndSaveStep1Form;
  const [values, setValues] = useState<Step2FormValues>(() => ({
    firstName: initialStep2.firstName,
    lastName: initialStep2.lastName,
    email: initialStep2.email,
    password: '',
    confirmPassword: '',
    birthMonth: initialStep1.birthMonth,
    birthDay: initialStep1.birthDay,
    birthYear: initialStep1.birthYear
  }));
  const [errors, setErrors] = useState<Step2FieldErrors>({});
  const [oauthPending, setOauthPending] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const liveBirthErrors = useMemo(
    () =>
      validateBirthDateFields(
        {
          birthMonth: values.birthMonth,
          birthDay: values.birthDay,
          birthYear: values.birthYear
        },
        { requireAll: false }
      ),
    [values.birthMonth, values.birthDay, values.birthYear]
  );
  const birthMonthError = errors.birthMonth ?? liveBirthErrors.birthMonth;
  const birthDayError = errors.birthDay ?? liveBirthErrors.birthDay;
  const birthYearError = errors.birthYear ?? liveBirthErrors.birthYear;
  const birthDateError = errors.birthDate ?? liveBirthErrors.birthDate;
  const birthAgeError = errors.age ?? liveBirthErrors.age;

  const handleGoogleAuth = async () => {
    const base = loadDraft();
    if (!base) {
      toast({
        variant: 'destructive',
        title: 'Could not load your answers',
        description:
          'Refresh the page and try again, or create an account with email instead.'
      });
      return;
    }

    const birthGate = validateBirthDateFields(
      {
        birthMonth: values.birthMonth,
        birthDay: values.birthDay,
        birthYear: values.birthYear
      },
      { requireAll: true }
    );
    if (Object.keys(birthGate).length > 0) {
      setErrors((prev) => ({ ...prev, ...birthGate }));
      toast({
        variant: 'destructive',
        title: 'Add your birthday',
        description: 'We need your date of birth before you continue with Google.'
      });
      return;
    }

    /** Merge step 2 in memory + persist — avoids losing steps 1–3 when base was ever null. */
    const draft: typeof base = {
      ...base,
      step1: {
        ...base.step1,
        birthMonth: values.birthMonth.trim(),
        birthDay: values.birthDay.trim(),
        birthYear: values.birthYear.trim()
      },
      step2: {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim()
      }
    };
    saveStep1Birth(
      {
        ...draft.step1
      },
      base
    );
    saveStep2Fields(draft.step2, loadDraft());

    const built = buildCompleteScholarshipUserProfile(draft, { forGoogleOAuth: true });
    if (!built.ok) {
      toast({
        variant: 'destructive',
        title: 'Complete your profile first',
        description:
          'Finish every onboarding step (about you, state, and GPA) before signing in with Google. Account name and email can be filled by Google.'
      });
      return;
    }

    setOauthPending(true);
    try {
      const res = await fetch('/api/onboarding/pending-oauth-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ draft })
      });
      if (!res.ok) {
        const errJson = (await res.json().catch(() => null)) as { error?: string } | null;
        toast({
          variant: 'destructive',
          title: 'Could not save your answers',
          description:
            errJson?.error ??
            'Check your connection and try again, or use email signup instead.'
        });
        setOauthPending(false);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthCallbackUrlWithNext(oauthRedirectAfterAuthPath)
        }
      });
      if (error) {
        setOauthPending(false);
        toast({
          variant: 'destructive',
          title: 'Google sign-in failed',
          description: error.message
        });
      }
    } catch {
      setOauthPending(false);
      toast({
        variant: 'destructive',
        title: 'Something went wrong',
        description: 'Try again in a moment.'
      });
    }
  };

  function setField<K extends keyof Step2FormValues>(key: K, v: Step2FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      delete next.submit;
      if (key === 'birthMonth' || key === 'birthDay' || key === 'birthYear') {
        delete next.birthDate;
        delete next.age;
      }
      return next;
    });
  }

  const handleBirthDayChange = (e: ChangeEvent<HTMLInputElement>) => {
    setField('birthDay', sanitizeBirthDayInput(e.target.value));
  };

  const handleBirthYearChange = (e: ChangeEvent<HTMLInputElement>) => {
    setField('birthYear', sanitizeBirthYearInput(e.target.value));
  };

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const base = loadDraft();
      if (!base) return;
      saveStep1Birth(
        {
          ...base.step1,
          birthMonth: values.birthMonth,
          birthDay: values.birthDay,
          birthYear: values.birthYear
        },
        base
      );
      saveStep2Fields(
        {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email
        },
        loadDraft()
      );
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    values.firstName,
    values.lastName,
    values.email,
    values.birthMonth,
    values.birthDay,
    values.birthYear
  ]);

  const fieldClass = (key: keyof Step2FormValues) =>
    errors[key] ? inputErrorClass : inputClass;
  const isSaas = visualVariant === 'saas';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateScholarshipOnboardingStep2(values);
    if (!result.ok) {
      setErrors(result.errors);
      const firstError =
        result.errors.submit ??
        result.errors.birthDate ??
        result.errors.age ??
        result.errors.birthMonth ??
        result.errors.birthDay ??
        result.errors.birthYear ??
        result.errors.firstName ??
        result.errors.lastName ??
        result.errors.email ??
        result.errors.password ??
        result.errors.confirmPassword ??
        'Please review your details.';
      toast({
        variant: 'destructive',
        title: 'Please check your details',
        description: firstError
      });
      return;
    }
    setErrors({});
    const base = loadDraft();
    if (base) {
      saveStep1Birth(
        {
          ...base.step1,
          birthMonth: values.birthMonth.trim(),
          birthDay: values.birthDay.trim(),
          birthYear: values.birthYear.trim()
        },
        base
      );
    }
    saveStep2Fields(
      {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim()
      },
      loadDraft()
    );
    onContinue({
      ...values,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      birthMonth: values.birthMonth.trim(),
      birthDay: values.birthDay.trim(),
      birthYear: values.birthYear.trim()
    });
  };

  return (
    <div className="w-full space-y-6">
      <button
        type="button"
        onClick={onBack}
        disabled={disabled}
        className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
      >
        <ArrowLeft className="mr-2 inline h-4 w-4" aria-hidden />
        Back
      </button>
      <div className="mx-auto max-w-lg text-center">
        {isSaas ? (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3E8] text-[#FF7A1A] ring-1 ring-[#FFD9B3]">
            <Mail className="h-6 w-6" aria-hidden />
          </div>
        ) : null}
        <p className={`${isSaas ? 'mt-5 text-[#A45A16]' : 'text-zinc-500'} text-xs font-semibold uppercase tracking-[0.14em]`}>
          {progressEyebrow ?? 'Step 4 of 4 · Account'}
        </p>
        <h2
          id="onboarding-step2-title"
          className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${isSaas ? 'text-[#7A3B00]' : 'text-zinc-900'}`}
        >
          Create your account
        </h2>
        <p className={`mx-auto mt-3 flex max-w-md flex-col gap-1 text-base font-medium leading-7 sm:max-w-lg ${isSaas ? 'text-[#8C5A2B]' : 'text-zinc-600'}`}>
          <span>
            Your email is used to save your matches and personalize results.
          </span>
          <span>We never sell your data.</span>
        </p>
      </div>

      <form className="space-y-5 text-left" onSubmit={handleSubmit} noValidate>
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
                <p className={hintClass}>{birthMonthError}</p>
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
              {birthDayError ? <p className={hintClass}>{birthDayError}</p> : null}
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
              {birthYearError ? <p className={hintClass}>{birthYearError}</p> : null}
            </div>
          </div>
          {birthDateError ? (
            <p className={`${hintClass} mt-2`}>{birthDateError}</p>
          ) : null}
          {birthAgeError ? <p className={`${hintClass} mt-2`}>{birthAgeError}</p> : null}
        </div>

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
        {!errors.password ? (
          <p className="text-center text-xs text-zinc-500">{PASSWORD_POLICY_HINT}</p>
        ) : null}

        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={disabled || isSubmitting || oauthPending}
          className="bg-white border border-gray-300 rounded-xl py-3 px-4 w-full flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors text-gray-700 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            width={20}
            height={20}
            aria-hidden
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.8 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
          Continue with Google
        </button>

        <button
          type="submit"
          disabled={disabled}
          aria-busy={isSubmitting}
          className={ONBOARDING_PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting ? 'Creating account...' : 'Create account & find scholarships'}
          {!isSubmitting && isSaas ? (
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          ) : !isSubmitting ? (
            ' →'
          ) : null}
        </button>
      </form>
    </div>
  );
}
