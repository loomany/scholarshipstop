'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { UsStateAutocomplete } from '@/components/onboarding/UsStateAutocomplete';
import { normalizeUsStateToCanonical } from '@/lib/constants/usStates';
import {
  loadLandingQuizDraft,
  saveStep4LandingDraftFields
} from '@/lib/onboarding/getScholarshipsLandingDraft';
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
  draftStore?: 'onboarding' | 'landing';
  /** Overrides “Step 2 of 4 · State” (e.g. landing quiz uses 3 steps). */
  progressEyebrow?: string;
  allowSkipEmpty?: boolean;
  title?: string;
  description?: string;
  helperText?: string;
};

export function ScholarshipOnboardingStep4State({
  disabled = false,
  initialStep4,
  onBack,
  onContinue,
  draftStore = 'onboarding',
  progressEyebrow,
  allowSkipEmpty = false,
  title,
  description,
  helperText
}: Props) {
  const loadDraft =
    draftStore === 'landing' ? loadLandingQuizDraft : loadStoredOnboardingDraft;
  const saveStep4Fields =
    draftStore === 'landing' ? saveStep4LandingDraftFields : saveStep4DraftFields;
  const [stateInput, setStateInput] = useState(() => initialStep4.state);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveStep4Fields({ state: stateInput }, loadDraft());
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [stateInput]);

  const persistAndContinue = () => {
    const trimmed = stateInput.trim();
    if (allowSkipEmpty && !trimmed) {
      setError(null);
      saveStep4Fields({ state: '' }, loadDraft());
      onContinue();
      return;
    }
    const canonical = normalizeUsStateToCanonical(trimmed);
    if (!canonical) {
      setError(
        trimmed
          ? 'Choose a state from the suggestions — we only save a valid U.S. state name.'
          : allowSkipEmpty
            ? 'Choose a valid state from the suggestions, or leave this field empty.'
            : 'Please select your U.S. state.'
      );
      return;
    }
    setError(null);
    saveStep4Fields({ state: canonical }, loadDraft());
    onContinue();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    persistAndContinue();
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
          {progressEyebrow ?? 'Step 2 of 4 · State'}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {title ?? 'What state are you in?'}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base font-medium leading-7 text-zinc-600 sm:max-w-lg">
          {description ??
            (allowSkipEmpty
              ? 'Add your state if you want more local scholarship matches.'
              : 'This helps us filter scholarships by state.')}
        </p>
      </div>

      <form className="space-y-5 text-left" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="onb-state" id="onb-state-label" className={sectionLabelClass}>
            U.S. state
          </label>
          <UsStateAutocomplete
            id="onb-state"
            labelId="onb-state-label"
            value={stateInput}
            onChange={(v) => {
              setStateInput(v);
              setError(null);
            }}
            disabled={disabled}
          />
          <p className={hintClass}>
            {helperText ??
              (allowSkipEmpty
                ? 'Optional. If you add one, choose a suggestion from the list so we save a valid U.S. state name.'
                : 'Choose a suggestion from the list — we only save a valid U.S. state name.')}
          </p>
          {error ? <p className={hintClass}>{error}</p> : null}
        </div>

        <div className="flex flex-col gap-3">
          <button type="submit" disabled={disabled} className={ONBOARDING_PRIMARY_BUTTON_CLASS}>
            Continue →
          </button>
        </div>
      </form>
    </div>
  );
}
