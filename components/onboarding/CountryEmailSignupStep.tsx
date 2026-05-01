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
};

export function CountryEmailSignupStep({
  disabled = false,
  submitting = false,
  email,
  countryLabel,
  progressEyebrow,
  title = 'Where should we send your scholarship matches?',
  description,
  submitLabel = 'Save my matches',
  error = null,
  onEmailChange,
  onBack,
  onSubmit
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
          disabled={disabled || submitting}
          aria-busy={submitting}
          className={ONBOARDING_PRIMARY_BUTTON_CLASS}
        >
          {submitting ? 'Saving...' : submitLabel}
          {!submitting ? <ArrowRight className="ml-2 h-4 w-4" aria-hidden /> : null}
        </button>
        <p className="text-center text-xs leading-5 text-zinc-500">
          You can unsubscribe anytime. No password needed now; if you want one later,
          use forgot password.
        </p>
      </form>
    </div>
  );
}
