'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BrainCircuit, CheckCircle2 } from 'lucide-react';

import { DarkSelect } from '@/components/home/DarkSelect';
import {
  CITIZENSHIP_OPTIONS,
  US_STATE_OPTIONS
} from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  FIELD_OF_STUDY_OPTIONS,
  SCHOOL_LEVEL_OPTIONS
} from '@/lib/constants/scholarshipProfileOptions';
import {
  SCHOLARSHIP_GPA_BUCKET_OPTIONS,
  SCHOLARSHIP_GPA_OPTIONS
} from '@/lib/constants/scholarshipGpaOptions';
import type { QualificationData } from '@/lib/iqAssessmentTypes';

type PostAssessmentQuizProps = {
  storageKey: string;
  onComplete: (qualificationData: QualificationData) => void;
};

type QuizOption = {
  value: string;
  label: string;
};

type QuizStep = {
  id: keyof QualificationData;
  eyebrow: string;
  title: string;
  description: string;
  label: string;
  placeholder: string;
  options: QuizOption[];
};

const schoolLevelOptions = SCHOOL_LEVEL_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label
}));

const fieldOfStudyOptions = FIELD_OF_STUDY_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label
}));

const citizenshipOptions = CITIZENSHIP_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label
}));

const stateOptions = US_STATE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label
}));

const gpaOptions = [
  ...SCHOLARSHIP_GPA_BUCKET_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label
  })),
  ...SCHOLARSHIP_GPA_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label
  }))
];

const steps: QuizStep[] = [
  {
    id: 'schoolLevel',
    eyebrow: 'School level',
    title: 'What is your school level?',
    description:
      'We use this to tighten recommendations by education stage, just like the scholarship matching quiz.',
    label: 'Current school level',
    placeholder: 'Select your school level',
    options: schoolLevelOptions
  },
  {
    id: 'fieldOfStudy',
    eyebrow: 'Field of study',
    title: 'What field of study are you pursuing?',
    description:
      'Your major helps connect your cognitive profile to the right scholarship categories.',
    label: 'Field of study',
    placeholder: 'Select your field of study',
    options: fieldOfStudyOptions
  },
  {
    id: 'citizenship',
    eyebrow: 'Citizenship',
    title: 'What is your citizenship status?',
    description:
      'Scholarship eligibility often depends on citizenship or international student status.',
    label: 'Citizenship status',
    placeholder: 'Select citizenship status',
    options: citizenshipOptions
  },
  {
    id: 'state',
    eyebrow: 'State',
    title: 'What U.S. state are you in?',
    description:
      'Add a state if you want the strategy to include state-specific scholarship signals.',
    label: 'U.S. state',
    placeholder: 'Select your state',
    options: stateOptions
  },
  {
    id: 'gpa',
    eyebrow: 'GPA',
    title: "What's your GPA?",
    description:
      'GPA helps us rank scholarships with academic requirements and avoid weak-fit paths.',
    label: 'GPA',
    placeholder: 'Select your GPA',
    options: gpaOptions
  }
];

function isCompleteDraft(value: Partial<QualificationData>): value is QualificationData {
  return Boolean(
    value.schoolLevel &&
      value.fieldOfStudy &&
      value.citizenship &&
      value.gpa
  );
}

function readDraft(storageKey: string): Partial<QualificationData> {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<QualificationData>;
  } catch {
    return {};
  }
}

function writeDraft(storageKey: string, draft: Partial<QualificationData>) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Ignore storage failures.
  }
}

export default function PostAssessmentQuiz({
  storageKey,
  onComplete
}: PostAssessmentQuizProps) {
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<Partial<QualificationData>>({});

  useEffect(() => {
    const saved = readDraft(storageKey);
    setDraft(saved);
    if (Object.keys(saved).length > 0) {
      const firstMissing = steps.findIndex((step) => !saved[step.id]);
      setStarted(true);
      setCurrentStep(firstMissing === -1 ? steps.length - 1 : firstMissing);
    }
  }, [storageKey]);

  useEffect(() => {
    writeDraft(storageKey, draft);
  }, [draft, storageKey]);

  const step = steps[currentStep]!;
  const progress = useMemo(
    () => Math.round(((currentStep + 1) / steps.length) * 100),
    [currentStep]
  );

  const choose = (stepId: keyof QualificationData, value: string) => {
    const next = { ...draft, [stepId]: value } as Partial<QualificationData>;
    setDraft(next);
  };

  const continueStep = () => {
    if (currentStep >= steps.length - 1) {
      if (isCompleteDraft(draft)) {
        onComplete({ ...draft, state: draft.state ?? '' });
      }
      return;
    }

    setCurrentStep((index) => Math.min(index + 1, steps.length - 1));
  };

  if (!started) {
    return (
      <main className="fixed inset-0 z-[200] overflow-y-auto bg-[#F8FAFC] px-4 py-8 text-slate-950 sm:px-6">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center">
          <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-[0_24px_70px_-34px_rgba(15,23,42,0.42)] sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <BrainCircuit className="h-7 w-7" aria-hidden />
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Your IQ profile is ready.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
              Add 5 scholarship details to reveal matched grants, award amounts,
              deadlines, and essay next steps based on your cognitive profile.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-700">
              Takes about 45 seconds. No long form.
            </p>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 sm:w-auto"
            >
              Reveal matched grants
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-[200] overflow-y-auto bg-[#F8FAFC] px-4 py-8 text-slate-950 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.42)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                {step.eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {step.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {step.description}
              </p>
            </div>
            <p className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
              Step {currentStep + 1} of {steps.length} • Takes 45 seconds
            </p>
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-950 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-8">
            <label
              htmlFor={`iq-qualification-${step.id}`}
              className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500"
            >
              {step.label}
            </label>
            <DarkSelect
              id={`iq-qualification-${step.id}`}
              ariaLabel={step.label}
              options={[{ value: '', label: step.placeholder }, ...step.options]}
              value={draft[step.id] ?? ''}
              onChange={(value) => choose(step.id, value)}
              menuClassName={step.id === 'fieldOfStudy' ? 'max-h-72' : undefined}
            />
            {draft[step.id] ? (
              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Saved for your strategy
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep((index) => Math.max(0, index - 1))}
              disabled={currentStep === 0}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={continueStep}
              disabled={step.id !== 'state' && !draft[step.id]}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {currentStep === steps.length - 1 ? 'Save and continue' : 'Continue'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
