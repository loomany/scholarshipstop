'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  startImmediately?: boolean;
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

function StateAutocomplete({
  id,
  label,
  placeholder,
  value,
  onChange
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const selected = stateOptions.find((option) => option.value === value);
  const [query, setQuery] = useState(selected?.label ?? '');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selected?.label ?? '');
  }, [selected?.label]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const showSuggestions = open && normalizedQuery.length > 0;
  const matches = stateOptions
    .filter((option) => {
      return (
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.value.toLowerCase().includes(normalizedQuery)
      );
    })
    .slice(0, 8);

  const chooseState = (option: QuizOption) => {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        type="text"
        value={query}
        onFocus={() => setOpen(query.trim().length > 0)}
        onChange={(event) => {
          const nextQuery = event.target.value;
          const exactMatch = stateOptions.find(
            (option) =>
              option.label.toLowerCase() === nextQuery.trim().toLowerCase() ||
              option.value.toLowerCase() === nextQuery.trim().toLowerCase()
          );
          setQuery(nextQuery);
          onChange(exactMatch?.value ?? '');
          setOpen(nextQuery.trim().length > 0);
        }}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm outline-none transition-all duration-200 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-200/70"
      />
      {showSuggestions ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-44 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg ring-1 ring-black/5">
          {matches.length > 0 ? (
            matches.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => chooseState(option)}
                className="block w-full px-4 py-2.5 text-left text-sm text-zinc-900 transition hover:bg-zinc-50"
              >
                {option.label}
              </button>
            ))
          ) : (
            <p className="px-4 py-2.5 text-sm text-zinc-500">No state found</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function PostAssessmentQuiz({
  storageKey,
  startImmediately = false,
  onComplete
}: PostAssessmentQuizProps) {
  const [started, setStarted] = useState(startImmediately);
  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<Partial<QualificationData>>({});

  useEffect(() => {
    const saved = readDraft(storageKey);
    setDraft(saved);
    if (Object.keys(saved).length > 0) {
      const firstMissing = steps.findIndex((step) => !saved[step.id]);
      setStarted(true);
      setCurrentStep(firstMissing === -1 ? steps.length - 1 : firstMissing);
    } else if (startImmediately) {
      setStarted(true);
    }
  }, [startImmediately, storageKey]);

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
      <main className="fixed inset-0 z-[200] overflow-hidden bg-[#F8FAFC] px-4 py-8 text-slate-950 sm:px-6">
        <section className="mx-auto flex h-full max-w-3xl items-center">
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
    <main className="fixed inset-0 z-[200] overflow-hidden bg-[#F8FAFC] px-3 py-3 text-slate-950 sm:px-6 sm:py-8">
      <section className="mx-auto flex h-full max-w-4xl items-center">
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
            {step.id === 'state' ? (
              <StateAutocomplete
                id={`iq-qualification-${step.id}`}
                label={step.label}
                placeholder={step.placeholder}
                value={draft.state ?? ''}
                onChange={(value) => choose('state', value)}
              />
            ) : (
              <DarkSelect
                id={`iq-qualification-${step.id}`}
                ariaLabel={step.label}
                options={[{ value: '', label: step.placeholder }, ...step.options]}
                value={draft[step.id] ?? ''}
                onChange={(value) => choose(step.id, value)}
                menuClassName={step.id === 'fieldOfStudy' ? 'max-h-72' : undefined}
              />
            )}
            {draft[step.id] ? (
              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Saved for your strategy
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row-reverse sm:justify-between">
            <button
              type="button"
              onClick={continueStep}
              disabled={step.id !== 'state' && !draft[step.id]}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {currentStep === steps.length - 1 ? 'Save and continue' : 'Continue'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep((index) => Math.max(0, index - 1))}
              disabled={currentStep === 0}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
