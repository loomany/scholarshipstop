'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { GetScholarshipsQuizStep1Basics } from '@/components/get-scholarships/GetScholarshipsQuizStep1Basics';
import { ScholarshipOnboardingStep3Gpa } from '@/components/onboarding/ScholarshipOnboardingStep3Gpa';
import { ScholarshipOnboardingStep4State } from '@/components/onboarding/ScholarshipOnboardingStep4State';
import {
  clearLandingQuizDraft,
  emptyLandingQuizDraft,
  loadLandingQuizDraft,
  saveFullLandingQuizDraft
} from '@/lib/onboarding/getScholarshipsLandingDraft';
import type { OnboardingFormValues, StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';
import { buildScholarshipProfileFilterSeedFromQuizDraft } from '@/lib/scholarships/profileFilterDefaults';
import { stashLandingQuizDraftForOnboardingMerge } from '@/lib/onboarding/mergeLandingQuizIntoOnboardingDraft';
import { LANDING_QUIZ_HUB_SEED_KEY } from '@/lib/scholarships/landingQuizHubSession';
import { validateScholarshipOnboardingBasicsWithoutBirth } from '@/lib/validation/scholarshipOnboardingSchema';
import { validateScholarshipOnboardingStep3Gpa } from '@/lib/validation/scholarshipOnboardingStep3Schema';
import { validateScholarshipOnboardingStep4Draft } from '@/lib/validation/scholarshipOnboardingStep4Schema';
import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';
import { toast } from '@/components/ui/Toasts/use-toast';
import { SCHOLARSHIPS_HUB_BEST_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';

function notifyDestructive(title: string, description?: string) {
  toast({
    variant: 'destructive',
    title,
    description
  });
}

type LandingQuizStep = 1 | 2 | 3;

function defaultResumeLandingQuizStep(draft: StoredOnboardingDraft): LandingQuizStep {
  if (!validateScholarshipOnboardingBasicsWithoutBirth(draft.step1).ok) return 1;
  if (!validateScholarshipOnboardingStep4Draft(draft.step4).ok) return 2;
  if (!validateScholarshipOnboardingStep3Gpa(draft.step3).ok) return 3;
  return 3;
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

  useEffect(() => {
    setDraft(loadLandingQuizDraft() ?? emptyLandingQuizDraft());
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
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

  const handleStep1Continue = useCallback(
    (values: OnboardingFormValues) => {
      const base = loadLandingQuizDraft() ?? emptyLandingQuizDraft();
      persistFull({
        ...base,
        v: 7,
        quizVariant: 'landing_no_birth',
        step1: values,
        activeStep: 2
      });
      setQuizStep(2);
    },
    [persistFull]
  );

  const handleAfterState = useCallback(() => {
    const base = loadLandingQuizDraft() ?? emptyLandingQuizDraft();
    persistFull({
      ...base,
      v: 7,
      quizVariant: 'landing_no_birth',
      activeStep: 3
    });
    setQuizStep(3);
  }, [persistFull]);

  const landingQuizCompleteRef = useRef(false);

  const completeAndGoToHub = useCallback(() => {
    if (landingQuizCompleteRef.current) return;
    const base = loadLandingQuizDraft() ?? emptyLandingQuizDraft();
    const seed = buildScholarshipProfileFilterSeedFromQuizDraft(base);
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
    stashLandingQuizDraftForOnboardingMerge(base);
    clearLandingQuizDraft();
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

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          {step === 1 ? (
            <GetScholarshipsQuizStep1Basics
              disabled={false}
              initialStep1={draft.step1}
              onContinue={handleStep1Continue}
            />
          ) : null}
          {step === 2 ? (
            <ScholarshipOnboardingStep4State
              disabled={false}
              draftStore="landing"
              progressEyebrow="Step 2 of 3 · State"
              initialStep4={draft.step4}
              onBack={() => handleBack(1)}
              onContinue={handleAfterState}
            />
          ) : null}
          {step === 3 ? (
            <ScholarshipOnboardingStep3Gpa
              disabled={false}
              draftStore="landing"
              progressEyebrow="Step 3 of 3 · GPA"
              submitButtonLabel="See scholarship matches →"
              initialStep3={draft.step3}
              onBack={() => handleBack(2)}
              onContinue={completeAndGoToHub}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
