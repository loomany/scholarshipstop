'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { DarkSelect } from '@/components/home/DarkSelect';
import { UsStateAutocomplete } from '@/components/onboarding/UsStateAutocomplete';
import { CITIZENSHIP_OPTIONS } from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  FIELD_OF_STUDY_OPTIONS,
  SCHOOL_LEVEL_OPTIONS
} from '@/lib/constants/scholarshipProfileOptions';
import { normalizeUsStateToCanonical } from '@/lib/constants/usStates';
import {
  SCHOLARSHIP_GPA_BUCKET_OPTIONS,
  SCHOLARSHIP_GPA_OPTIONS
} from '@/lib/constants/scholarshipGpaOptions';
import type { BestRecommendationWizardStore } from '@/lib/onboarding/bestRecommendationWizardDraft';
import { validateScholarshipOnboardingStep3Gpa } from '@/lib/validation/scholarshipOnboardingStep3Schema';

const schoolLevelOptions = [
  { value: '', label: 'Select your school level' },
  ...SCHOOL_LEVEL_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label
  }))
];

const fieldOfStudyOptions = [
  { value: '', label: 'Select your field of study' },
  ...FIELD_OF_STUDY_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label
  }))
];

const citizenshipOptions = [
  { value: '', label: 'Select citizenship status' },
  ...CITIZENSHIP_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label
  }))
];

const gpaOptions = [
  { value: '', label: 'Select your GPA' },
  ...SCHOLARSHIP_GPA_BUCKET_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label
  })),
  ...SCHOLARSHIP_GPA_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label
  }))
];

const labelClass =
  'mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-gray-700';
const helperClass = 'mt-2 text-sm leading-relaxed text-zinc-500';
const backButtonClass =
  'inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50';
const primaryButtonClass =
  'inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FF7A1A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#E6670C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB27D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

type Props = {
  store: BestRecommendationWizardStore;
  saving?: boolean;
  onChange: (next: BestRecommendationWizardStore) => void;
  onPersistSignedInStep?: (next: BestRecommendationWizardStore) => Promise<void>;
  onSubmit: (next: BestRecommendationWizardStore) => Promise<void> | void;
};

type WizardStepConfig = {
  step: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
};

const STEP_CONFIG: WizardStepConfig[] = [
  {
    step: 1,
    title: 'What is your school level?',
    description: 'We use this to match scholarships to the right education stage.'
  },
  {
    step: 2,
    title: 'What field of study are you pursuing?',
    description: 'Many scholarships are targeted to a specific major or academic path.'
  },
  {
    step: 3,
    title: 'What is your citizenship status?',
    description: 'Citizenship affects eligibility for many scholarships.'
  },
  {
    step: 4,
    title: 'What U.S. state are you in?',
    description: 'Optional. Add it if you want to surface state-specific scholarships too.'
  },
  {
    step: 5,
    title: "What's your GPA?",
    description: 'This helps us rank scholarships with academic requirements.'
  }
];

export default function BestRecommendationWizard({
  store,
  saving = false,
  onChange,
  onPersistSignedInStep,
  onSubmit
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const currentStep = store.draft.activeStep;
  const currentConfig = useMemo(
    () => STEP_CONFIG.find((item) => item.step === currentStep) ?? STEP_CONFIG[0],
    [currentStep]
  );

  const updateStore = (mutate: (prev: BestRecommendationWizardStore) => BestRecommendationWizardStore) => {
    const next = mutate(store);
    onChange(next);
    setError(null);
  };

  const goBack = () => {
    if (currentStep === 1) return;
    updateStore((prev) => ({
      ...prev,
      submitted: false,
      draft: {
        ...prev.draft,
        activeStep: (currentStep - 1) as 1 | 2 | 3 | 4 | 5
      }
    }));
  };

  const continueStep = async () => {
    if (currentStep === 1 && !store.draft.step1.schoolLevel.trim()) {
      setError('Please select your school level.');
      return;
    }
    if (currentStep === 2 && !store.draft.step1.fieldOfStudy.trim()) {
      setError('Please select your field of study.');
      return;
    }
    if (currentStep === 3 && !store.draft.step1.citizenship.trim()) {
      setError('Please select your citizenship status.');
      return;
    }
    if (currentStep === 4) {
      const trimmed = store.draft.step4.state.trim();
      if (trimmed && !normalizeUsStateToCanonical(trimmed)) {
        setError(
          'Choose a state from the suggestions, or leave this field empty.'
        );
        return;
      }
    }
    if (currentStep === 5) {
      const result = validateScholarshipOnboardingStep3Gpa(store.draft.step3);
      if (!result.ok) {
        setError(result.errors.gpa ?? 'Please select your GPA.');
        return;
      }
    }

    const normalizedState =
      currentStep === 4
        ? normalizeUsStateToCanonical(store.draft.step4.state.trim()) ?? ''
        : store.draft.step4.state;

    const next: BestRecommendationWizardStore = {
      ...store,
      submitted: currentStep === 5,
      draft: {
        ...store.draft,
        activeStep:
          currentStep === 5
            ? 5
            : ((currentStep + 1) as 1 | 2 | 3 | 4 | 5),
        step4: {
          state: normalizedState
        }
      }
    };

    onChange(next);

    if (onPersistSignedInStep) {
      await onPersistSignedInStep(next);
    }

    if (currentStep === 5) {
      await onSubmit(next);
    }
  };

  return (
    <div className="mt-4 flex w-full flex-col items-center px-2 pb-10 pt-2 sm:mt-6 sm:pb-16 sm:pt-4">
      <div className="w-full max-w-2xl rounded-3xl border border-[#FFD9B3] bg-gradient-to-b from-[#FFF8F1] to-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A45A16]">
            Best recommendation wizard
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-[#7A3B00] sm:text-3xl">
            {currentConfig.title}
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#8C5A2B] sm:text-base">
            {currentConfig.description}
          </p>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-[#A45A16]">
            <span>
              Step {currentStep} of 5
            </span>
            <span>{Math.round((currentStep / 5) * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#FFE5CC]">
            <div
              className="h-full rounded-full bg-[#FF7A1A] transition-all"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-8 space-y-5 text-left">
          {currentStep === 1 ? (
            <div>
              <label htmlFor="best-rec-school-level" className={labelClass}>
                School level
              </label>
              <DarkSelect
                id="best-rec-school-level"
                options={schoolLevelOptions}
                value={store.draft.step1.schoolLevel}
                onChange={(value) =>
                  updateStore((prev) => ({
                    ...prev,
                    submitted: false,
                    draft: {
                      ...prev.draft,
                      step1: {
                        ...prev.draft.step1,
                        schoolLevel: value
                      }
                    }
                  }))
                }
                hasError={Boolean(error)}
                disabled={saving}
              />
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div>
              <label htmlFor="best-rec-field-of-study" className={labelClass}>
                Field of study
              </label>
              <DarkSelect
                id="best-rec-field-of-study"
                options={fieldOfStudyOptions}
                value={store.draft.step1.fieldOfStudy}
                onChange={(value) =>
                  updateStore((prev) => ({
                    ...prev,
                    submitted: false,
                    draft: {
                      ...prev.draft,
                      step1: {
                        ...prev.draft.step1,
                        fieldOfStudy: value
                      }
                    }
                  }))
                }
                hasError={Boolean(error)}
                disabled={saving}
                menuClassName="max-h-72"
              />
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div>
              <label htmlFor="best-rec-citizenship" className={labelClass}>
                Citizenship
              </label>
              <DarkSelect
                id="best-rec-citizenship"
                ariaLabel="Citizenship"
                options={citizenshipOptions}
                value={store.draft.step1.citizenship}
                onChange={(value) =>
                  updateStore((prev) => ({
                    ...prev,
                    submitted: false,
                    draft: {
                      ...prev.draft,
                      step1: {
                        ...prev.draft.step1,
                        citizenship: value
                      }
                    }
                  }))
                }
                hasError={Boolean(error)}
                disabled={saving}
              />
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div>
              <label htmlFor="best-rec-state" id="best-rec-state-label" className={labelClass}>
                U.S. state (optional)
              </label>
              <UsStateAutocomplete
                id="best-rec-state"
                labelId="best-rec-state-label"
                value={store.draft.step4.state}
                onChange={(value) =>
                  updateStore((prev) => ({
                    ...prev,
                    submitted: false,
                    draft: {
                      ...prev.draft,
                      step4: {
                        state: value
                      }
                    }
                  }))
                }
                disabled={saving}
              />
              <p className={helperClass}>
                Leave it empty if you want a broader recommendation set.
              </p>
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div>
              <label htmlFor="best-rec-gpa" className={labelClass}>
                GPA
              </label>
              <DarkSelect
                id="best-rec-gpa"
                ariaLabel="GPA"
                options={gpaOptions}
                value={store.draft.step3.gpa}
                onChange={(value) =>
                  updateStore((prev) => ({
                    ...prev,
                    submitted: false,
                    draft: {
                      ...prev.draft,
                      step3: {
                        gpa: value
                      }
                    }
                  }))
                }
                hasError={Boolean(error)}
                disabled={saving}
                menuClassName="max-h-72"
              />
            </div>
          ) : null}

          {error ? <p className="text-sm font-medium text-[#B54708]">{error}</p> : null}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={saving || currentStep === 1}
            className={backButtonClass}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void continueStep()}
              disabled={saving}
              className={primaryButtonClass}
            >
              {saving
                ? 'Saving...'
                : currentStep === 5
                  ? 'Find My Scholarships'
                  : 'Continue'}
              {!saving ? <ArrowRight className="ml-2 h-4 w-4" aria-hidden /> : null}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
