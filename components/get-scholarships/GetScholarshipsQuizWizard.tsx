'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, GraduationCap, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { GetScholarshipsQuizSingleSelectStep } from '@/components/get-scholarships/GetScholarshipsQuizSingleSelectStep';
import { CountryEmailSignupStep } from '@/components/onboarding/CountryEmailSignupStep';
import { CountryFirstStep } from '@/components/onboarding/CountryFirstStep';
import { ScholarshipOnboardingStep3Gpa } from '@/components/onboarding/ScholarshipOnboardingStep3Gpa';
import { ScholarshipOnboardingStep4State } from '@/components/onboarding/ScholarshipOnboardingStep4State';
import {
  citizenshipLabelForValue,
  CITIZENSHIP_OPTIONS
} from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  FIELD_OF_STUDY_OPTIONS,
  fieldOfStudyLabelForValue,
  SCHOOL_LEVEL_OPTIONS,
  schoolLevelLabelForValue
} from '@/lib/constants/scholarshipProfileOptions';
import {
  clearLandingQuizDraft,
  emptyLandingQuizDraft,
  loadLandingQuizDraft,
  loadCompletedLandingQuizDraft,
  loadLandingQuizSelectedCountry,
  saveCompletedLandingQuizDraft,
  saveFullLandingQuizDraft,
  saveLandingQuizSelectedCountry
} from '@/lib/onboarding/getScholarshipsLandingDraft';
import type { OnboardingFormValues, StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';
import {
  buildScholarshipProfileFilterSeedFromCountry,
  buildScholarshipProfileFilterSeedFromDraftWithoutBirth
} from '@/lib/scholarships/profileFilterDefaults';
import { stashLandingQuizDraftForOnboardingMerge } from '@/lib/onboarding/mergeLandingQuizIntoOnboardingDraft';
import { LANDING_QUIZ_HUB_SEED_KEY } from '@/lib/scholarships/landingQuizHubSession';
import { validateScholarshipOnboardingStep3Gpa } from '@/lib/validation/scholarshipOnboardingStep3Schema';
import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';
import { toast } from '@/components/ui/Toasts/use-toast';
import { SCHOLARSHIPS_HUB_BEST_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';
import { notifyQuizCompletionClient } from '@/lib/analytics/notifyQuizCompletionClient';
import { normalizeUsStateToCanonical } from '@/lib/constants/usStates';
import {
  gpaForProfile,
  gpaForProfileDb,
  isGpaBucketChoice,
  PROFILE_GPA_SELECTION_SNAPSHOT_KEY
} from '@/lib/constants/scholarshipGpaOptions';
import {
  countryLabelFromCode,
  normalizeCountryCode
} from '@/lib/scholarships/countryEligibility/countries';
import { createCountryFirstScholarshipAccount } from '@/lib/onboarding/countryFirstSignupClient';
import {
  isBestRecommendationWizardDraftComplete,
  loadBestRecommendationWizardDraft
} from '@/lib/onboarding/bestRecommendationWizardDraft';
import { getOAuthCallbackUrlWithNext } from '@/utils/helpers';

function notifyDestructive(title: string, description?: string) {
  toast({
    variant: 'destructive',
    title,
    description
  });
}

type LandingQuizStep = 'country' | 1 | 2 | 3 | 4 | 5 | 'email';

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

function defaultResumeLandingQuizStep(
  draft: StoredOnboardingDraft,
  selectedCountryCode: string
): LandingQuizStep {
  if (!selectedCountryCode) return 'country';
  if (selectedCountryCode !== 'US') return 'email';
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
  const [quizStep, setQuizStep] = useState<LandingQuizStep>('country');
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [countryError, setCountryError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [stepReady, setStepReady] = useState(false);
  const [navigatingToHub, setNavigatingToHub] = useState(false);
  const [googleSignInPending, setGoogleSignInPending] = useState(false);

  useEffect(() => {
    setDraft(loadLandingQuizDraft() ?? emptyLandingQuizDraft());
    let storedCountry = loadLandingQuizSelectedCountry();
    if (typeof window !== 'undefined') {
      const fromQuery = normalizeCountryCode(
        new URLSearchParams(window.location.search).get('country')
      );
      if (fromQuery) {
        storedCountry = fromQuery;
        saveLandingQuizSelectedCountry(fromQuery);
      }
    }
    setSelectedCountryCode(storedCountry);
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
    setEmail(draft.step2.email);
    setQuizStep(defaultResumeLandingQuizStep(draft, selectedCountryCode));
    setStepReady(true);
  }, [draft, selectedCountryCode, stepReady]);

  const persistFull = useCallback((next: StoredOnboardingDraft) => {
    saveFullLandingQuizDraft(next);
    setDraft(next);
  }, []);

  const updateStep1AndAdvance = useCallback(
    (key: keyof OnboardingFormValues, value: string, nextStep: 1 | 2 | 3 | 4 | 5) => {
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

  const finishAndGoToHub = useCallback(
    async (options: {
      source: string;
      profile: Parameters<typeof createCountryFirstScholarshipAccount>[0]['profile'];
      seed: ReturnType<typeof buildScholarshipProfileFilterSeedFromCountry>;
      completedDraft?: StoredOnboardingDraft;
    }) => {
    if (landingQuizCompleteRef.current) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    if (!selectedCountryCode) {
      setEmailError('Choose your country first.');
      setQuizStep('country');
      return;
    }
    if (!options.seed) {
      setEmailError('Could not prepare your scholarship filters.');
      return;
    }

    landingQuizCompleteRef.current = true;
    setEmailError(null);
    setNavigatingToHub(true);

    const signup = await createCountryFirstScholarshipAccount({
      email: normalizedEmail,
      countryCode: selectedCountryCode,
      source: options.source,
      profile: options.profile
    });
    if (!signup.ok) {
      landingQuizCompleteRef.current = false;
      setNavigatingToHub(false);
      setEmailError(signup.error);
      return;
    }

    try {
      sessionStorage.setItem(LANDING_QUIZ_HUB_SEED_KEY, JSON.stringify(options.seed));
    } catch {
      landingQuizCompleteRef.current = false;
      setNavigatingToHub(false);
      notifyDestructive(
        'Could not save your filters',
        'Check browser storage settings and try again.'
      );
      return;
    }
    const draftForCompletion =
      options.completedDraft ?? loadLandingQuizDraft() ?? emptyLandingQuizDraft();
    const completedDraft = {
      ...draftForCompletion,
      step2: {
        ...draftForCompletion.step2,
        email: normalizedEmail
      }
    };
    saveCompletedLandingQuizDraft(completedDraft);
    stashLandingQuizDraftForOnboardingMerge(completedDraft);
    clearLandingQuizDraft();
    void notifyQuizCompletionClient({
      flow: 'get_scholarships_quiz',
      landingPath: '/get-scholarships',
      authState: 'guest',
      onceKey: 'st_quiz_complete_get_scholarships',
      country: `${countryLabelFromCode(selectedCountryCode)} (${selectedCountryCode})`,
      email: normalizedEmail
    });
    router.replace(SCHOLARSHIPS_HUB_BEST_MATCHES_HREF);
  },
  [email, router, selectedCountryCode]);

  const countryLabel = selectedCountryCode
    ? countryLabelFromCode(selectedCountryCode)
    : 'your country';

  const handleCountryContinue = useCallback(() => {
    const code = normalizeCountryCode(selectedCountryCode);
    if (!code) {
      setCountryError('Choose your country to continue.');
      return;
    }
    setCountryError(null);
    saveLandingQuizSelectedCountry(code);
    setSelectedCountryCode(code);
    setQuizStep(code === 'US' ? 1 : 'email');
  }, [selectedCountryCode]);

  const buildSignupProfileFromDraft = useCallback(
    (base: StoredOnboardingDraft, onboardingCompleted: boolean) => {
      const schoolLevel = base.step1.schoolLevel.trim() || null;
      const fieldOfStudy = base.step1.fieldOfStudy.trim() || null;
      const citizenship = base.step1.citizenship.trim() || null;
      const gpaChoice = gpaForProfile(base.step3.gpa);
      const gpaSelection = isGpaBucketChoice(gpaChoice) ? gpaChoice : null;
      return {
        schoolLevel,
        schoolLevelLabel: schoolLevel ? schoolLevelLabelForValue(schoolLevel) : null,
        fieldOfStudy,
        fieldOfStudyLabel: fieldOfStudy ? fieldOfStudyLabelForValue(fieldOfStudy) : null,
        citizenshipStatus: citizenship,
        citizenshipStatusLabel: citizenship ? citizenshipLabelForValue(citizenship) : null,
        stateRegion: normalizeUsStateToCanonical(base.step4.state.trim()) ?? null,
        gpa: gpaForProfileDb(gpaChoice),
        savedFiltersSnapshot: gpaSelection
          ? { [PROFILE_GPA_SELECTION_SNAPSHOT_KEY]: gpaSelection }
          : null,
        onboardingCompleted
      };
    },
    []
  );

  const completeCountryOnlySignup = useCallback(() => {
    const seed = buildScholarshipProfileFilterSeedFromCountry(selectedCountryCode);
    void finishAndGoToHub({
      source: 'get-scholarships-country',
      profile: { onboardingCompleted: false },
      seed
    });
  }, [finishAndGoToHub, selectedCountryCode]);

  const completeUsQuizSignup = useCallback(() => {
    const base = loadLandingQuizDraft() ?? emptyLandingQuizDraft();
    const seed = buildScholarshipProfileFilterSeedFromDraftWithoutBirth(base);
    if (!seed) {
      notifyDestructive(
        'Almost there',
        'Please complete all steps before continuing.'
      );
      return;
    }
    seed.applicantCountryCodes = ['US'];
    void finishAndGoToHub({
      source: 'get-scholarships-us-quiz',
      profile: buildSignupProfileFromDraft(base, true),
      seed,
      completedDraft: base
    });
  }, [buildSignupProfileFromDraft, finishAndGoToHub]);

  const continueWithGoogle = useCallback(async () => {
    if (!selectedCountryCode) {
      setEmailError('Choose your country first.');
      setQuizStep('country');
      return;
    }
    const base = loadLandingQuizDraft() ?? emptyLandingQuizDraft();
    const seed =
      selectedCountryCode === 'US'
        ? buildScholarshipProfileFilterSeedFromDraftWithoutBirth(base)
        : buildScholarshipProfileFilterSeedFromCountry(selectedCountryCode);
    if (!seed) {
      notifyDestructive(
        'Almost there',
        selectedCountryCode === 'US'
          ? 'Please complete all steps before continuing with Google.'
          : 'Could not prepare your scholarship filters.'
      );
      return;
    }
    seed.applicantCountryCodes = [selectedCountryCode];

    setEmailError(null);
    setGoogleSignInPending(true);
    setNavigatingToHub(true);
    try {
      sessionStorage.setItem(LANDING_QUIZ_HUB_SEED_KEY, JSON.stringify(seed));
      const completedDraft = {
        ...base,
        step2: {
          ...base.step2,
          email: ''
        }
      };
      saveCompletedLandingQuizDraft(completedDraft);
      stashLandingQuizDraftForOnboardingMerge(completedDraft);
      clearLandingQuizDraft();
    } catch {
      setGoogleSignInPending(false);
      setNavigatingToHub(false);
      notifyDestructive(
        'Could not save your filters',
        'Check browser storage settings and try again.'
      );
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthCallbackUrlWithNext(SCHOLARSHIPS_HUB_BEST_MATCHES_HREF)
      }
    });
    if (error) {
      setGoogleSignInPending(false);
      setNavigatingToHub(false);
      setEmailError(error.message || 'Google sign-in failed.');
    }
  }, [selectedCountryCode]);

  const handleBack = useCallback(
    (s: LandingQuizStep) => {
      if (s === 'country') {
        setQuizStep('country');
        return;
      }
      if (s === 'email') {
        setQuizStep('email');
        return;
      }
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

  const step = draft
    ? stepReady
      ? quizStep
      : defaultResumeLandingQuizStep(draft, selectedCountryCode)
    : 'country';

  useEffect(() => {
    if (step !== 'email') return;
    router.prefetch(SCHOLARSHIPS_HUB_BEST_MATCHES_HREF);
  }, [router, step]);

  if (!draft) {
    return (
      <SiteBrandLoading
        label="Loading your progress…"
        className="min-h-[calc(100dvh-4rem)]"
      />
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-zinc-50 px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-lg translate-y-3 sm:translate-y-4">
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
          {step === 'country' ? (
            <CountryFirstStep
              disabled={navigatingToHub}
              value={selectedCountryCode}
              progressEyebrow="Step 1 · Applicant country"
              error={countryError}
              onChange={(value) => {
                setSelectedCountryCode(value);
                setCountryError(null);
              }}
              onContinue={handleCountryContinue}
            />
          ) : null}
          {step === 1 ? (
            <GetScholarshipsQuizSingleSelectStep
              disabled={false}
              progressEyebrow="Step 2 of 7 · Basics"
              title="Tell us about you"
              description="Optional. Pick it to tighten recommendations by education stage, or skip for broader results."
              label="Current school level"
              selectId="gsq-school-level"
              options={schoolLevelOptions}
              value={draft.step1.schoolLevel}
              error={null}
              icon={GraduationCap}
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
              onBack={() => handleBack('country')}
              onContinue={() => {
                updateStep1AndAdvance('schoolLevel', draft.step1.schoolLevel, 2);
              }}
            />
          ) : null}
          {step === 2 ? (
            <GetScholarshipsQuizSingleSelectStep
              disabled={false}
              progressEyebrow="Step 3 of 7 · Basics"
              title="What do you want to study?"
              description="Optional. Pick a major to narrow matches, or skip to keep recommendations broader."
              label="Field of study"
              selectId="gsq-field-of-study"
              options={fieldOfStudyOptions}
              value={draft.step1.fieldOfStudy}
              error={null}
              menuClassName="max-h-72"
              icon={BookOpen}
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
              progressEyebrow="Step 4 of 7 · Basics"
              title="What is your citizenship status?"
              description="Optional. Add it for stricter eligibility matching, or skip for a wider set of grants."
              label="Citizenship status"
              selectId="gsq-citizenship"
              ariaLabel="Citizenship status"
              options={citizenshipOptions}
              value={draft.step1.citizenship}
              error={null}
              icon={Sparkles}
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
              progressEyebrow="Step 5 of 7 · State"
              initialStep4={draft.step4}
              allowSkipEmpty
              title="What U.S. state are you in?"
              description="Optional. Add it if you want to surface state-specific scholarships too."
              helperText="Leave it empty if you want a broader recommendation set."
              visualVariant="saas"
              onBack={() => handleBack(3)}
              onContinue={handleAfterState}
            />
          ) : null}
          {step === 5 ? (
            <ScholarshipOnboardingStep3Gpa
              disabled={navigatingToHub}
              draftStore="landing"
              progressEyebrow="Step 6 of 7 · GPA"
              submitButtonLabel={
                navigatingToHub ? 'Preparing your matches…' : 'Continue'
              }
              initialStep3={draft.step3}
              title="What's your GPA?"
              description="This helps us rank scholarships with academic requirements."
              visualVariant="saas"
              onBack={() => handleBack(4)}
              onContinue={() => setQuizStep('email')}
            />
          ) : null}
          {step === 'email' ? (
            <CountryEmailSignupStep
              disabled={navigatingToHub}
              submitting={navigatingToHub}
              email={email}
              countryLabel={countryLabel}
              progressEyebrow={
                selectedCountryCode === 'US'
                  ? 'Step 7 of 7 · Account'
                  : 'Step 2 of 2 · Account'
              }
              submitLabel={
                navigatingToHub ? 'Preparing your matches...' : 'See scholarship matches'
              }
              googleSubmitting={googleSignInPending}
              error={emailError}
              onEmailChange={(value) => {
                setEmail(value);
                setEmailError(null);
              }}
              onBack={() => handleBack(selectedCountryCode === 'US' ? 5 : 'country')}
              onSubmit={
                selectedCountryCode === 'US'
                  ? completeUsQuizSignup
                  : completeCountryOnlySignup
              }
              onGoogleSignIn={continueWithGoogle}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
