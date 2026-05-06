'use client';

import { type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';

import { SITE_INPUT_FOCUS_CLASS } from '@/lib/constants/siteInputFocus';
import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';

const inputClass = `w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-300 ${SITE_INPUT_FOCUS_CLASS}`;
const inputErrorClass = `w-full rounded-xl border border-amber-400/90 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 ${SITE_INPUT_FOCUS_CLASS}`;

type Props = {
  disabled?: boolean;
  submitting?: boolean;
  googleSubmitting?: boolean;
  email: string;
  countryLabel: string;
  progressEyebrow: string;
  title?: string;
  description?: string;
  submitLabel?: string;
  error?: string | null;
  onEmailChange: (value: string) => void;
  onBack?: () => void;
  onSubmit: () => void;
  onGoogleSignIn?: () => void;
};

export function CountryEmailSignupStep({
  disabled = false,
  submitting = false,
  googleSubmitting = false,
  email,
  countryLabel,
  progressEyebrow,
  title = 'Where should we send your scholarship matches?',
  description,
  submitLabel = 'Save my matches',
  error = null,
  onEmailChange,
  onBack,
  onSubmit,
  onGoogleSignIn
}: Props) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="w-full space-y-6">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={disabled || submitting}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
        >
          <ArrowLeft className="mr-2 inline h-4 w-4" aria-hidden />
          Back
        </button>
      ) : null}

      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3E8] text-[#FF7A1A] ring-1 ring-[#FFD9B3]">
          <Mail className="h-6 w-6" aria-hidden />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#A45A16]">
          {progressEyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#7A3B00] sm:text-3xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base font-medium leading-7 text-[#8C5A2B] sm:max-w-lg">
          {description ??
            `No spam. We will send one daily scholarship digest for ${countryLabel}, plus a confirmation link so your matches stay saved.`}
        </p>
      </div>

      <form className="space-y-5 text-left" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="country-email" className="sr-only">
            Email address
          </label>
          <input
            id="country-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="Email address"
            disabled={disabled || submitting}
            className={error ? inputErrorClass : inputClass}
          />
          {error ? (
            <p className="mt-2 text-sm font-medium text-[#B54708]">{error}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={disabled || submitting || googleSubmitting}
          aria-busy={submitting}
          className={ONBOARDING_PRIMARY_BUTTON_CLASS}
        >
          {submitLabel}
          {!submitting ? <ArrowRight className="ml-2 h-4 w-4" aria-hidden /> : null}
        </button>
        {onGoogleSignIn ? (
          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={disabled || submitting || googleSubmitting}
            aria-busy={googleSubmitting}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.1 0 9.8-2 13.3-5.2l-6.2-5.2C29.1 35.1 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C36.9 39.1 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
              />
            </svg>
            {googleSubmitting ? 'Opening Google...' : 'Sign in with Google'}
          </button>
        ) : null}
        <p className="text-center text-xs leading-5 text-zinc-500">
          You can unsubscribe anytime. No password needed now; if you want one later,
          use forgot password.
        </p>
      </form>
    </div>
  );
}
