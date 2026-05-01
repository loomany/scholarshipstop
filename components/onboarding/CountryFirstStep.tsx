'use client';

import { type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Globe2 } from 'lucide-react';

import { DarkSelect } from '@/components/home/DarkSelect';
import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';
import { SCHOLARSHIP_COUNTRY_OPTIONS } from '@/lib/scholarships/countryEligibility/countries';

const countryOptions = [
  { value: '', label: 'Select your country' },
  ...SCHOLARSHIP_COUNTRY_OPTIONS.map((country) => ({
    value: country.code,
    label:
      country.code === 'US'
        ? 'United States (America)'
        : country.label
  }))
];

type Props = {
  disabled?: boolean;
  value: string;
  progressEyebrow: string;
  title?: string;
  description?: string;
  error?: string | null;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack?: () => void;
};

export function CountryFirstStep({
  disabled = false,
  value,
  progressEyebrow,
  title = 'Which country are you applying from?',
  description = 'Choose your citizenship or home country first so we can show scholarships you are more likely eligible for.',
  error = null,
  onChange,
  onContinue,
  onBack
}: Props) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onContinue();
  };

  return (
    <div className="w-full space-y-6">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={disabled}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
        >
          <ArrowLeft className="mr-2 inline h-4 w-4" aria-hidden />
          Back
        </button>
      ) : null}

      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3E8] text-[#FF7A1A] ring-1 ring-[#FFD9B3]">
          <Globe2 className="h-6 w-6" aria-hidden />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#A45A16]">
          {progressEyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#7A3B00] sm:text-3xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base font-medium leading-7 text-[#8C5A2B] sm:max-w-lg">
          {description}
        </p>
      </div>

      <form className="space-y-5 text-left" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="country-first-country"
            className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-gray-700"
          >
            Applicant country / citizenship
          </label>
          <DarkSelect
            id="country-first-country"
            ariaLabel="Applicant country or citizenship"
            options={countryOptions}
            value={value}
            onChange={onChange}
            disabled={disabled}
            hasError={Boolean(error)}
            menuClassName="max-h-72"
          />
          {error ? (
            <p className="mt-2 text-sm font-medium text-[#B54708]">{error}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={disabled}
          className={ONBOARDING_PRIMARY_BUTTON_CLASS}
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
