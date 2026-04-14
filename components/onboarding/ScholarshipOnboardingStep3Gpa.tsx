'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DarkSelect } from '@/components/home/DarkSelect';
import {
  normalizeGpaForSelect,
  SCHOLARSHIP_GPA_OPTIONS,
  SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY
} from '@/lib/constants/scholarshipGpaOptions';
import {
  loadStoredOnboardingDraft,
  saveStep3DraftFields,
  type OnboardingStep3DraftFields
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';
import { validateScholarshipOnboardingStep3Gpa } from '@/lib/validation/scholarshipOnboardingStep3Schema';

const gpaSelectOptions = [
  { value: '', label: 'Select your GPA' },
  ...SCHOLARSHIP_GPA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
];

const hintClass = 'mt-1 text-sm text-zinc-600';

const sectionLabelClass =
  'mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-gray-700';

type Props = {
  disabled?: boolean;
  initialStep3: OnboardingStep3DraftFields;
  onBack: () => void;
  onContinue: () => void;
};

export function ScholarshipOnboardingStep3Gpa({
  disabled = false,
  initialStep3,
  onBack,
  onContinue
}: Props) {
  const [gpa, setGpa] = useState(() => {
    const n = normalizeGpaForSelect(initialStep3.gpa);
    return n === SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY ? '' : n;
  });
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveStep3DraftFields({ gpa }, loadStoredOnboardingDraft());
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [gpa]);

  const runFinish = (gpaValue: string) => {
    const v = validateScholarshipOnboardingStep3Gpa({ gpa: gpaValue });
    if (!v.ok) {
      setError(v.errors.gpa ?? 'Invalid selection');
      return;
    }
    setError(null);
    saveStep3DraftFields({ gpa: gpaValue.trim() }, loadStoredOnboardingDraft());
    onContinue();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runFinish(gpa);
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
          Step 3 of 4 · GPA
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          What&apos;s your GPA?
        </h2>
        <p className="mx-auto mt-3 flex max-w-md flex-col gap-1 text-base font-medium leading-7 text-zinc-600 sm:max-w-lg">
          <span>Some scholarships use academic standing.</span>
        </p>
        <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-zinc-500 sm:max-w-lg">
          Adding your GPA can help surface scholarships that better match your
          academic profile.
        </p>
      </div>

      <form className="space-y-5 text-left" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="onb-gpa" className={sectionLabelClass}>
            GPA
          </label>
          <DarkSelect
            id="onb-gpa"
            ariaLabel="GPA"
            options={gpaSelectOptions}
            value={gpa}
            onChange={(v) => {
              setGpa(v);
              setError(null);
            }}
            disabled={disabled}
            hasError={Boolean(error)}
            menuClassName="max-h-72"
          />
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
