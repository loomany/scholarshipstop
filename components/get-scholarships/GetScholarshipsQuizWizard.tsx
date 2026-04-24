'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { GetScholarshipsQuizSingleSelectStep } from '@/components/get-scholarships/GetScholarshipsQuizSingleSelectStep';
import { ScholarshipOnboardingStep3Gpa } from '@/components/onboarding/ScholarshipOnboardingStep3Gpa';
import { ScholarshipOnboardingStep4State } from '@/components/onboarding/ScholarshipOnboardingStep4State';
import { CITIZENSHIP_OPTIONS } from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  FIELD_OF_STUDY_OPTIONS,
  SCHOOL_LEVEL_OPTIONS
} from '@/lib/constants/scholarshipProfileOptions';
import {
  clearLandingQuizDraft,
  emptyLandingQuizDraft,
  loadLandingQuizDraft,
  loadCompletedLandingQuizDraft,
  saveCompletedLandingQuizDraft,
  saveFullLandingQuizDraft
} from '@/lib/onboarding/getScholarshipsLandingDraft';
import type { OnboardingFormValues, StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';
import { buildScholarshipProfileFilterSeedFromDraftWithoutBirth } from '@/lib/scholarships/profileFilterDefaults';
import { stashLandingQuizDraftForOnboardingMerge } from '@/lib/onboarding/mergeLandingQuizIntoOnboardingDraft';
import { LANDING_QUIZ_HUB_SEED_KEY } from '@/lib/scholarships/landingQuizHubSession';
import { validateScholarshipOnboardingStep3Gpa } from '@/lib/validation/scholarshipOnboardingStep3Schema';
import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';
import { toast } from '@/components/ui/Toasts/use-toast';
import { SCHOLARSHIPS_HUB_BEST_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';
import { notifyQuizCompletionClient } from '@/lib/analytics/notifyQuizCompletionClient';
import {
  isBestRecommendationWizardDraftComplete,
  loadBestRecommendationWizardDraft
} from '@/lib/onboarding/bestRecommendationWizardDraft';

function notifyDestructive(title: string, description?: string) {
  toast({
    variant: 'destructive',
    title,
    description
  });
}

type LandingQuizStep = 1 | 2 | 3 | 4 | 5;

const schoolLevelOptions = [
  { value: '', label: 'Select your school level' },
  ...SCHOOL_LEVEL_OPTIONS.map((option) => ({ value: option.value, label: option.label }))
];

const fieldOfStudyOptions = [
  { value: '', label: 'Select your field of study' },
  ...FIELD_OF_STUDY_OPTIONS.map((option) => ({ value: option.value, label: option.label }))
];

const citizenshipOptions = [
  { value: '', label: 'Select citizenship status' },
  ...CITIZENSHIP_OPTIONS.map((option) => ({ value: option.value, label: option.label }))
];

function defaultResumeLandingQuizStep(draft: StoredOnboardingDraft): LandingQuizStep {
  if (draft.activeStep === 1 || draft.activeStep === 2 || draft.activeStep === 3) {
    return draft.activeStep;
  }
  if (draft.activeStep === 4) return 4;
  if (!validateScholarshipOnboardingStep3Gpa(draft.step3).ok) return 5;
  return 5;
}

type Props = {
  /** Used when the user is already signed in (skip quiz → hub). */
  afterAuthPath?: string;
  onLeaveQuiz?: () => void;
};

export function GetScholarshipsQuizWizard({
  afterAuthPath = SCHOLARSHIPS_HUB_BEST_MATCHES_HREF,
  onLeaveQuiz
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<StoredOnboardingDraft | null>(null);
  const [quizStep, setQuizStep] = useState<LandingQuizStep>(1);
  const [stepReady, setStepReady] = useState(false);
  const [navigatingToHub, setNavigatingToHub] = useState(false);

  useEffect(() => {
    setDraft(loadLandingQuizDraft() ?? emptyLandingQuizDraft());
  }, []);

  useEffect(() => {
    void router.prefetch(afterAuthPath);
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace(afterAuthPath);
        return;
      }
      const completedDraft = loadCompletedLandingQuizDraft();
      const completedSeed =
        completedDraft
          ? buildScholarshipProfileFilterSeedFromDraftWithoutBirth(completedDraft)
          : null;
      const bestWizardDraft = loadBestRecommendationWizardDraft();
      const hasCompletedBestWizard =
        Boolean(bestWizardDraft?.submitted) &&
        isBestRecommendationWizardDraftComplete(bestWizardDraft);
      if (completedSeed || hasCompletedBestWizard) {
        router.replace(afterAuthPath);
      }
    });
  }, [router, afterAuthPath]);

  useEffect(() => {
    if (!draft || stepReady) return;
    setQuizStep(defaultResumeLandingQuizStep(draft));
    setStepReady(true);
  }, [draft, stepReady]);

  const persistFull = useCallback((next: StoredOnboardingDraft) => {
    saveFullLandingQuizDraft(next);
    setDraft(next);
  }, []);

  const updateStep1AndAdvance = useCallback(
    (key: keyof OnboardingFormValues, value: string, nextStep: LandingQuizStep) => {
      const base = loadLandingQuizDraft() ?? emptyLandingQuizDraft();
      persistFull({
        ...base,
        v: 7,
        quizVariant: 'landing_no_birth',
        step1: {
          ...base.step1,
          [key]: value
        },
        activeStep: nextStep
      });
      setQuizStep(nextStep);
    },
    [persistFull]
  );

  const handleAfterState = useCallback(() => {
    const base = loadLandingQuizDraft() ?? emptyLandingQuizDraft();
    persistFull({
      ...base,
      v: 7,
      quizVariant: 'landing_no_birth',
      activeStep: 5
    });
    setQuizStep(5);
  }, [persistFull]);

  const landingQuizCompleteRef = useRef(false);

  const completeAndGoToHub = useCallback(() => {
    if (landingQuizCompleteRef.current) return;
    const base = loadLandingQuizDraft() ?? emptyLandingQuizDraft();
    const seed = buildScholarshipProfileFilterSeedFromDraftWithoutBirth(base);
    if (!seed) {
      notifyDestructive(
        'Almost there',
        'Please complete all steps before continuing.'
      );
      return;
    }
    landingQuizCompleteRef.current = true;
    try {
      sessionStorage.setItem(LANDING_QUIZ_HUB_SEED_KEY, JSON.stringify(seed));
    } catch {
      landingQuizCompleteRef.current = false;
      notifyDestructive(
        'Could not save your filters',
        'Check browser storage settings and try again.'
      );
      return;
    }
    saveCompletedLandingQuizDraft(base);
    stashLandingQuizDraftForOnboardingMerge(base);
    clearLandingQuizDraft();
    setNavigatingToHub(true);
    void notifyQuizCompletionClient({
      flow: 'get_scholarships_quiz',
      landingPath: '/get-scholarships',
      authState: 'guest',
      onceKey: 'st_quiz_complete_get_scholarships'
    });
    router.push(SCHOLARSHIPS_HUB_BEST_MATCHES_HREF);
  }, [router]);

  const handleBack = useCallback(
    (s: LandingQuizStep) => {
      const base = loadLandingQuizDraft() ?? emptyLandingQuizDraft();
      persistFull({
        ...base,
        v: 7,
        quizVariant: 'landing_no_birth',
        activeStep: s
      });
      setQuizStep(s);
    },
    [persistFull]
  );

  if (!draft) {
    return (
      <SiteBrandLoading
        label="Loading your progress…"
        className="min-h-[calc(100dvh-4rem)]"
      />
    );
  }

  const step = stepReady ? quizStep : defaultResumeLandingQuizStep(draft);

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-zinc-50 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-lg">
        {typeof onLeaveQuiz === 'function' ? (
          <button
            type="button"
            onClick={onLeaveQuiz}
            className="mb-8 text-sm text-gray-600 no-underline transition hover:text-black hover:underline"
          >
            ← Back to intro
          </button>
        ) : null}

        <div className="mb-8 text-center sm:mb-10">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Get matched with scholarships in 2 minutes
          </h1>
          <p className="mx-auto mt-4 max-w-md text-pretty text-lg leading-relaxed text-zinc-600">
            Answer a few quick questions and find scholarships you can apply for today
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          {step === 1 ? (
            <GetScholarshipsQuizSingleSelectStep
              disabled={false}
              progressEyebrow="Step 1 of 5 · Basics"
              title="What is your school level?"
              description="Optional. Pick it to tighten recommendations by education stage, or skip for broader results."
              label="Current school level"
              selectId="gsq-school-level"
              options={schoolLevelOptions}
              value={draft.step1.schoolLevel}
              error={null}
              onChange={(value) =>
                persistFull({
                  ...draft,
                  v: 7,
                  quizVariant: 'landing_no_birth',
                  step1: {
                    ...draft.step1,
                    schoolLevel: value
                  }
                })
              }
              onContinue={() => {
                updateStep1AndAdvance('schoolLevel', draft.step1.schoolLevel, 2);
              }}
            />
          ) : null}
          {step === 2 ? (
            <GetScholarshipsQuizSingleSelectStep
              disabled={false}
              progressEyebrow="Step 2 of 5 · Basics"
              title="What field of study are you pursuing?"
              description="Optional. Pick a major to narrow matches, or skip to keep recommendations broader."
              label="Field of study"
              selectId="gsq-field-of-study"
              options={fieldOfStudyOptions}
              value={draft.step1.fieldOfStudy}
              error={null}
              menuClassName="max-h-72"
              onChange={(value) =>
                persistFull({
                  ...draft,
                  v: 7,
                  quizVariant: 'landing_no_birth',
                  step1: {
                    ...draft.step1,
                    fieldOfStudy: value
                  }
                })
              }
              onBack={() => handleBack(1)}
              onContinue={() => {
                updateStep1AndAdvance('fieldOfStudy', draft.step1.fieldOfStudy, 3);
              }}
            />
          ) : null}
          {step === 3 ? (
            <GetScholarshipsQuizSingleSelectStep
              disabled={false}
              progressEyebrow="Step 3 of 5 · Basics"
              title="What is your citizenship status?"
              description="Optional. Add it for stricter eligibility matching, or skip for a wider set of grants."
              label="Citizenship status"
              selectId="gsq-citizenship"
              ariaLabel="Citizenship status"
              options={citizenshipOptions}
              value={draft.step1.citizenship}
              error={null}
              onChange={(value) =>
                persistFull({
                  ...draft,
                  v: 7,
                  quizVariant: 'landing_no_birth',
                  step1: {
                    ...draft.step1,
                    citizenship: value
                  }
                })
              }
              onBack={() => handleBack(2)}
              onContinue={() => {
                updateStep1AndAdvance('citizenship', draft.step1.citizenship, 4);
              }}
            />
          ) : null}
          {step === 4 ? (
            <ScholarshipOnboardingStep4State
              disabled={false}
              draftStore="landing"
              progressEyebrow="Step 4 of 5 · State"
              initialStep4={draft.step4}
              allowSkipEmpty
              title="What U.S. state are you in?"
              description="Optional. Add it if you want to surface state-specific scholarships too."
              helperText="Leave it empty if you want a broader recommendation set."
              onBack={() => handleBack(3)}
              onContinue={handleAfterState}
            />
          ) : null}
          {step === 5 ? (
            <ScholarshipOnboardingStep3Gpa
              disabled={navigatingToHub}
              draftStore="landing"
              progressEyebrow="Step 5 of 5 · GPA"
              submitButtonLabel={
                navigatingToHub ? 'Preparing your matches…' : 'See scholarship matches →'
              }
              initialStep3={draft.step3}
              title="What's your GPA?"
              description="This helps us rank scholarships with academic requirements."
              onBack={() => handleBack(4)}
              onContinue={completeAndGoToHub}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
