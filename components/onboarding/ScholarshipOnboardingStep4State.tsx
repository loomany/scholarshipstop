'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { UsStateAutocomplete } from '@/components/onboarding/UsStateAutocomplete';
import {
  loadStoredOnboardingDraft,
  saveStep4DraftFields,
  type OnboardingStep4DraftFields
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';

const hintClass = 'mt-1 text-sm text-zinc-600';

const sectionLabelClass =
  'mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-gray-700';

type Props = {
  disabled?: boolean;
  initialStep4: OnboardingStep4DraftFields;
  onBack: () => void;
  onContinue: () => void;
};

export function ScholarshipOnboardingStep4State({
  disabled = false,
  initialStep4,
  onBack,
  onContinue
}: Props) {
  const [stateInput, setStateInput] = useState(() => initialStep4.state);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveStep4DraftFields({ state: stateInput }, loadStoredOnboardingDraft());
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [stateInput]);

  const persistAndContinue = () => {
    saveStep4DraftFields({ state: stateInput.trim() }, loadStoredOnboardingDraft());
    onContinue();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    persistAndContinue();
  };

  const handleSkip = () => {
    setStateInput('');
    saveStep4DraftFields({ state: '' }, loadStoredOnboardingDraft());
    onContinue();
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
          Step 2 of 5 · State
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          What state are you in?
        </h2>
        <p className="mx-auto mt-3 flex max-w-md flex-col gap-1 text-base font-medium leading-7 text-zinc-600 sm:max-w-lg">
          <span>Optional — this helps us filter scholarships by state.</span>
          <span>You can skip this step.</span>
        </p>
        <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-zinc-500 sm:max-w-lg">
          Adding your state helps us narrow scholarships that may be more relevant
          to you.
        </p>
      </div>

      <form className="space-y-5 text-left" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="onb-state" id="onb-state-label" className={sectionLabelClass}>
            U.S. state (optional)
          </label>
          <UsStateAutocomplete
            id="onb-state"
            labelId="onb-state-label"
            value={stateInput}
            onChange={setStateInput}
            disabled={disabled}
          />
          <p className={hintClass}>
            Choose a suggestion or leave blank — we only save a valid U.S. state name.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <button
            type="button"
            disabled={disabled}
            onClick={handleSkip}
            className="w-full rounded-xl border border-zinc-300 bg-white px-6 py-3.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 sm:w-1/2"
          >
            Skip
          </button>
          <button
            type="submit"
            disabled={disabled}
            className={`${ONBOARDING_PRIMARY_BUTTON_CLASS} sm:w-1/2`}
          >
            Continue →
          </button>
        </div>
      </form>
    </div>
  );
}
