'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from '@/components/ui/Toasts/use-toast';
import { buildCompleteScholarshipUserProfile } from '@/lib/onboarding/buildScholarshipUserProfile';
import {
  loadLandingQuizDraft,
  saveStep2LandingDraftFields
} from '@/lib/onboarding/getScholarshipsLandingDraft';
import {
  loadStoredOnboardingDraft,
  saveStep2DraftFields,
  type OnboardingStep2DraftFields
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import { SITE_INPUT_FOCUS_CLASS } from '@/lib/constants/siteInputFocus';
import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';
import { PASSWORD_POLICY_HINT } from '@/lib/validation/passwordPolicy';
import {
  validateScholarshipOnboardingStep2,
  type Step2FormValues,
  type Step2FieldErrors
} from '@/lib/validation/scholarshipOnboardingStep2Schema';
import { getOAuthCallbackUrlWithNext } from '@/utils/helpers';
import { createClient } from '@/utils/supabase/client';

const inputClass = `w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-300 ${SITE_INPUT_FOCUS_CLASS}`;

const inputErrorClass = `w-full rounded-xl border border-amber-400/90 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 ${SITE_INPUT_FOCUS_CLASS}`;

const hintClass = 'mt-1 text-sm text-zinc-600';

export type Step2ContinuePayload = Step2FormValues;

type Props = {
  disabled?: boolean;
  /** True while parent runs sign-up / finalize (inline button loading, no fullscreen overlay). */
  isSubmitting?: boolean;
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
};

export function ScholarshipOnboardingStep2({
  disabled = false,
  isSubmitting = false,
  initialStep2,
  onBack,
  onContinue,
  oauthRedirectAfterAuthPath,
  draftStore = 'onboarding'
}: Props) {
  const loadDraft =
    draftStore === 'landing' ? loadLandingQuizDraft : loadStoredOnboardingDraft;
  const saveStep2Fields =
    draftStore === 'landing' ? saveStep2LandingDraftFields : saveStep2DraftFields;
  const [values, setValues] = useState<Step2FormValues>(() => ({
    firstName: initialStep2.firstName,
    lastName: initialStep2.lastName,
    email: initialStep2.email,
    password: '',
    confirmPassword: ''
  }));
  const [errors, setErrors] = useState<Step2FieldErrors>({});
  const [oauthPending, setOauthPending] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    /** Merge step 2 in memory + persist — avoids losing steps 1–3 when base was ever null. */
    const draft: typeof base = {
      ...base,
      step2: {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim()
      }
    };
    saveStep2Fields(draft.step2, base);

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

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
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
    saveStep2Fields(
      {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim()
      },
      loadDraft()
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
          {isSubmitting ? 'Creating account...' : 'Create account & find scholarships →'}
        </button>
      </form>
    </div>
  );
}
