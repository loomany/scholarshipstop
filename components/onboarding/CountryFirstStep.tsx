'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, Globe2 } from 'lucide-react';

import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';
import {
  SCHOLARSHIP_COUNTRY_OPTIONS,
  countryLabelFromCode,
  normalizeCountryCode
} from '@/lib/scholarships/countryEligibility/countries';

type Props = {
  disabled?: boolean;
  value: string;
  progressEyebrow: string;
  title?: string;
  description?: string;
  error?: string | null;
  onChange: (value: string) => void;
  onContinue: (countryCodeRaw?: string) => void;
  onBack?: () => void;
  /** Mutually exclusive with `value`: broad catalog (no explicit applicant-country filter). */
  includeUnspecifiedApplicantCountries?: boolean;
  onIncludeUnspecifiedApplicantCountriesChange?: (next: boolean) => void;
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
  onBack,
  includeUnspecifiedApplicantCountries = false,
  onIncludeUnspecifiedApplicantCountriesChange
}: Props) {
  const [countryInput, setCountryInput] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRootRef = useRef<HTMLDivElement>(null);

  const normalizedValue = normalizeCountryCode(value);
  const optionByLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of SCHOLARSHIP_COUNTRY_OPTIONS) {
      map.set(option.label.trim().toLowerCase(), option.code);
      if (option.code === 'US') {
        map.set('united states', 'US');
        map.set('united states america', 'US');
        map.set('united states of america', 'US');
        map.set('usa', 'US');
        map.set('america', 'US');
      }
    }
    return map;
  }, []);

  useEffect(() => {
    if (includeUnspecifiedApplicantCountries) {
      setCountryInput('Citizenship not specified');
      return;
    }
    if (!normalizedValue) {
      setCountryInput('');
      return;
    }
    const label =
      normalizedValue === 'US'
        ? 'United States (America)'
        : countryLabelFromCode(normalizedValue);
    setCountryInput(label);
  }, [includeUnspecifiedApplicantCountries, normalizedValue]);

  useEffect(() => {
    if (includeUnspecifiedApplicantCountries) {
      setCountryOpen(false);
    }
  }, [includeUnspecifiedApplicantCountries]);

  useEffect(() => {
    if (!countryOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (!countryRootRef.current?.contains(event.target as Node)) {
        setCountryOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCountryOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [countryOpen]);

  const resolveCountryCode = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const normalized = normalizeCountryCode(trimmed);
    if (normalized) return normalized;
    return optionByLabel.get(trimmed.toLowerCase()) ?? null;
  };

  const filteredCountries = useMemo(() => {
    const q = countryInput.trim().toLowerCase();
    const countries = SCHOLARSHIP_COUNTRY_OPTIONS.map((country) => ({
      code: country.code,
      label: country.code === 'US' ? 'United States (America)' : country.label
    }));
    const includeSpecial =
      typeof onIncludeUnspecifiedApplicantCountriesChange === 'function';
    const all = includeSpecial
      ? [
          {
            code: '__UNSPECIFIED__',
            label: 'Citizenship not specified'
          },
          ...countries
        ]
      : countries;
    if (!q) return all;
    return all.filter((country) => {
      const label = country.label.toLowerCase();
      const code = country.code.toLowerCase();
      return label.includes(q) || code.includes(q);
    });
  }, [countryInput, onIncludeUnspecifiedApplicantCountriesChange]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const manualCode = resolveCountryCode(countryInput);
    const fallbackCode = normalizeCountryCode(value);
    const resolved = manualCode ?? fallbackCode ?? value?.trim() ?? '';
    if (manualCode && manualCode !== normalizedValue) {
      onChange(manualCode);
    }
    onContinue(resolved);
  };

  const canContinue =
    Boolean(resolveCountryCode(countryInput) ?? value?.trim()) ||
    includeUnspecifiedApplicantCountries === true;

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
          <div ref={countryRootRef} className="relative">
            <input
              id="country-first-country"
              type="text"
              value={countryInput}
              onFocus={() => setCountryOpen(true)}
              onChange={(event) => {
                const next = event.target.value;
                if (
                  includeUnspecifiedApplicantCountries &&
                  next.trim().toLowerCase() !==
                    'citizenship not specified'.toLowerCase()
                ) {
                  onIncludeUnspecifiedApplicantCountriesChange?.(false);
                }
                setCountryInput(next);
                setCountryOpen(true);
                const code = resolveCountryCode(next);
                if (code) onChange(code);
              }}
              disabled={disabled}
              placeholder="Select or type your country"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-10 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200/80 disabled:cursor-not-allowed disabled:opacity-50"
              autoComplete="off"
            />
            <ChevronDown
              className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition ${
                countryOpen ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
            {countryOpen ? (
              <ul
                role="listbox"
                aria-label="Applicant country suggestions"
                className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-30 max-h-72 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
              >
                {filteredCountries.length === 0 ? (
                  <li className="px-4 py-2.5 text-sm text-zinc-500">No matches found.</li>
                ) : (
                  filteredCountries.map((country) => (
                    <li key={country.code}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-zinc-900 transition hover:bg-zinc-50"
                        onClick={() => {
                          if (country.code === '__UNSPECIFIED__') {
                            onIncludeUnspecifiedApplicantCountriesChange?.(true);
                            onChange('');
                            setCountryInput('Citizenship not specified');
                            setCountryOpen(false);
                            return;
                          }
                          onIncludeUnspecifiedApplicantCountriesChange?.(false);
                          onChange(country.code);
                          setCountryInput(country.label);
                          setCountryOpen(false);
                        }}
                      >
                        <span>{country.label}</span>
                        {country.code !== '__UNSPECIFIED__' ? (
                          <span className="text-xs font-semibold text-zinc-500">
                            {country.code}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">Optional</span>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
          {error ? (
            <p className="mt-2 text-sm font-medium text-[#B54708]">{error}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={disabled || !canContinue}
          className={ONBOARDING_PRIMARY_BUTTON_CLASS}
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
