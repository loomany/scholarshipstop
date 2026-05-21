'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { CountryEmailSignupStep } from '@/components/onboarding/CountryEmailSignupStep';
import { CountryFirstStep } from '@/components/onboarding/CountryFirstStep';
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
import type { StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';
import {
  buildScholarshipProfileFilterSeedForUnspecifiedApplicant,
  buildScholarshipProfileFilterSeedFromCountry,
  buildScholarshipProfileFilterSeedFromDraftWithoutBirth
} from '@/lib/scholarships/profileFilterDefaults';
import { stashLandingQuizDraftForOnboardingMerge } from '@/lib/onboarding/mergeLandingQuizIntoOnboardingDraft';
import { LANDING_QUIZ_HUB_SEED_KEY } from '@/lib/scholarships/landingQuizHubSession';
import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';
import { toast } from '@/components/ui/Toasts/use-toast';
import { SCHOLARSHIPS_HUB_BEST_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';
import { notifyQuizCompletionClient } from '@/lib/analytics/notifyQuizCompletionClient';
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
import {
  getGetScholarshipsQuizUiCopy,
  type GetScholarshipsQuizUiCopy
} from '@/lib/i18n/funnelUiCopy';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { localizedPilotHref } from '@/lib/i18n/localizedHref';

function notifyDestructive(title: string, description?: string) {
  toast({
    variant: 'destructive',
    title,
    description
  });
}

type LandingQuizStep = 'country' | 'email';

function defaultResumeLandingQuizStep(
  draft: StoredOnboardingDraft,
  selectedCountryCode: string
): LandingQuizStep {
  if (!selectedCountryCode.trim()) {
    if (
      draft.includeUnspecifiedApplicantCountries === true &&
      draft.landingDestinationScreenCompleted === true
    ) {
      return 'email';
    }
    return 'country';
  }
  return 'email';
}

type Props = {
  /** Used when the user is already signed in (skip quiz → hub). */
  afterAuthPath?: string;
  onLeaveQuiz?: () => void;
  /** When non-`en`, swaps visible copy and resolves the hub redirect to `/es|fr/scholarships`. */
  locale?: LocalizedUiLocale;
};

export function GetScholarshipsQuizWizard({
  afterAuthPath,
  onLeaveQuiz,
  locale = 'en'
}: Props) {
  const router = useRouter();
  const ui: GetScholarshipsQuizUiCopy = getGetScholarshipsQuizUiCopy(locale);
  const resolvedAfterAuthPath =
    afterAuthPath ??
    (locale === 'en'
      ? SCHOLARSHIPS_HUB_BEST_MATCHES_HREF
      : localizedPilotHref(locale, '/scholarships') ??
        SCHOLARSHIPS_HUB_BEST_MATCHES_HREF);
  const localizedScholarshipsHubHref =
    locale === 'en'
      ? SCHOLARSHIPS_HUB_BEST_MATCHES_HREF
      : localizedPilotHref(locale, '/scholarships') ??
        SCHOLARSHIPS_HUB_BEST_MATCHES_HREF;
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
    void router.prefetch(resolvedAfterAuthPath);
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace(resolvedAfterAuthPath);
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
        router.replace(resolvedAfterAuthPath);
      }
    });
  }, [router, resolvedAfterAuthPath]);

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
      setEmailError(ui.errorInvalidEmail);
      return;
    }
    const completionDraft =
      options.completedDraft ?? loadLandingQuizDraft() ?? emptyLandingQuizDraft();
    if (
      !selectedCountryCode &&
      completionDraft.includeUnspecifiedApplicantCountries !== true
    ) {
      setEmailError(ui.errorChooseCountry);
      setQuizStep('country');
      return;
    }
    if (!options.seed) {
      setEmailError(ui.errorCouldNotPrepareFilters);
      return;
    }

    landingQuizCompleteRef.current = true;
    setEmailError(null);
    setNavigatingToHub(true);

    const signup = await createCountryFirstScholarshipAccount({
      email: normalizedEmail,
      countryCode:
        completionDraft.includeUnspecifiedApplicantCountries === true
          ? null
          : selectedCountryCode,
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
      notifyDestructive(ui.errorCouldNotSaveFilters);
      return;
    }
    const draftForCompletion = completionDraft;
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
      country:
        options.completedDraft?.includeUnspecifiedApplicantCountries === true
          ? 'Citizenship not specified'
          : `${countryLabelFromCode(selectedCountryCode)} (${selectedCountryCode})`,
      email: normalizedEmail
    });
    router.replace(localizedScholarshipsHubHref);
  },
  [email, router, selectedCountryCode, ui, localizedScholarshipsHubHref]);

  const countryLabel =
    draft?.includeUnspecifiedApplicantCountries === true
      ? ui.citizenshipNotSpecified
      : selectedCountryCode
        ? countryLabelFromCode(selectedCountryCode)
        : ui.yourCountryFallback;

  const sanitizePreferredHostsForSignup = useCallback((d: StoredOnboardingDraft): string[] => {
    const raw = d.preferredHostCountryCodes ?? [];
    return [
      ...new Set(
        raw
          .map((c) => c.trim().toUpperCase())
          .filter((c) => /^[A-Z]{2}$/.test(c))
      )
    ];
  }, []);

  const handleCountryContinue = useCallback((countryCodeRaw?: string) => {
    const base = loadLandingQuizDraft() ?? emptyLandingQuizDraft();
    if (base.includeUnspecifiedApplicantCountries === true) {
      setCountryError(null);
      saveLandingQuizSelectedCountry('');
      setSelectedCountryCode('');
      persistFull({
        ...base,
        v: 8,
        quizVariant: 'landing_no_birth',
        landingDestinationScreenCompleted: true,
        includeUnspecifiedApplicantCountries: true,
        step4: { state: '', countryCode: '' },
        preferredHostCountryCodes: base.preferredHostCountryCodes ?? []
      });
      setQuizStep('email');
      return;
    }
    const code = normalizeCountryCode(countryCodeRaw ?? selectedCountryCode);
    if (!code) {
      setCountryError(ui.errorPickCountry);
      return;
    }
    setCountryError(null);
    saveLandingQuizSelectedCountry(code);
    setSelectedCountryCode(code);
    persistFull({
      ...base,
      v: 8,
      quizVariant: 'landing_no_birth',
      landingDestinationScreenCompleted: true,
      includeUnspecifiedApplicantCountries: false,
      step4: {
        ...base.step4,
        countryCode: code,
        state: ''
      },
      preferredHostCountryCodes: base.preferredHostCountryCodes ?? []
    });
    setQuizStep('email');
  }, [persistFull, selectedCountryCode]);

  const completeCountryOnlySignup = useCallback(() => {
    const base = loadLandingQuizDraft() ?? emptyLandingQuizDraft();
    const pref = sanitizePreferredHostsForSignup(base);
    if (base.includeUnspecifiedApplicantCountries === true) {
      const seed = buildScholarshipProfileFilterSeedForUnspecifiedApplicant(pref);
      void finishAndGoToHub({
        source: 'get-scholarships-country-unspecified',
        profile: {
          onboardingCompleted: false,
          includeUnspecifiedApplicantCountries: true,
          savedFiltersSnapshot: { includeUnspecifiedApplicantCountries: true },
          ...(pref.length ? { preferredHostCountryCodes: pref } : {})
        },
        seed,
        completedDraft: base
      });
      return;
    }
    const seed = buildScholarshipProfileFilterSeedFromCountry(selectedCountryCode, pref);
    void finishAndGoToHub({
      source: 'get-scholarships-country',
      profile: { onboardingCompleted: false, ...(pref.length ? { preferredHostCountryCodes: pref } : {}) },
      seed
    });
  }, [finishAndGoToHub, sanitizePreferredHostsForSignup, selectedCountryCode]);

  const continueWithGoogle = useCallback(async () => {
    const base = loadLandingQuizDraft() ?? emptyLandingQuizDraft();
    const pref = sanitizePreferredHostsForSignup(base);
    if (!selectedCountryCode && base.includeUnspecifiedApplicantCountries !== true) {
      setEmailError(ui.errorChooseCountry);
      setQuizStep('country');
      return;
    }
    let seed =
      base.includeUnspecifiedApplicantCountries === true
        ? buildScholarshipProfileFilterSeedForUnspecifiedApplicant(pref)
        : buildScholarshipProfileFilterSeedFromCountry(selectedCountryCode, pref);
    if (!seed) {
      notifyDestructive(ui.errorCouldNotPrepareFilters);
      return;
    }

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
      notifyDestructive(ui.errorCouldNotSaveFilters);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthCallbackUrlWithNext(localizedScholarshipsHubHref)
      }
    });
    if (error) {
      setGoogleSignInPending(false);
      setNavigatingToHub(false);
      setEmailError(error.message || ui.errorGoogleSignInFailed);
    }
  }, [
    sanitizePreferredHostsForSignup,
    selectedCountryCode,
    ui,
    localizedScholarshipsHubHref
  ]);

  const step = draft
    ? stepReady
      ? quizStep
      : defaultResumeLandingQuizStep(draft, selectedCountryCode)
    : 'country';

  useEffect(() => {
    if (step !== 'email') return;
    router.prefetch(localizedScholarshipsHubHref);
  }, [router, step, localizedScholarshipsHubHref]);

  if (!draft) {
    return (
      <SiteBrandLoading
        label={ui.loadingProgress}
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
            {ui.backToIntro}
          </button>
        ) : null}

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          {step === 'country' ? (
            <CountryFirstStep
              disabled={navigatingToHub}
              locale={locale}
              value={selectedCountryCode}
              includeUnspecifiedApplicantCountries={
                draft.includeUnspecifiedApplicantCountries === true
              }
              onIncludeUnspecifiedApplicantCountriesChange={(next) => {
                setCountryError(null);
                const b = loadLandingQuizDraft() ?? emptyLandingQuizDraft();
                if (next) {
                  saveLandingQuizSelectedCountry('');
                  setSelectedCountryCode('');
                }
                persistFull({
                  ...b,
                  v: 8,
                  quizVariant: 'landing_no_birth',
                  includeUnspecifiedApplicantCountries: next,
                  step4: {
                    ...b.step4,
                    countryCode: next ? '' : b.step4.countryCode ?? '',
                    state: next ? '' : b.step4.state
                  },
                  preferredHostCountryCodes: b.preferredHostCountryCodes ?? []
                });
              }}
              progressEyebrow={ui.countryStepProgress}
              error={countryError}
              onChange={(value) => {
                setSelectedCountryCode(value);
                setCountryError(null);
                const b = loadLandingQuizDraft() ?? emptyLandingQuizDraft();
                persistFull({
                  ...b,
                  v: 8,
                  quizVariant: 'landing_no_birth',
                  includeUnspecifiedApplicantCountries: false,
                  step4: {
                    ...b.step4,
                    countryCode: value,
                    state: ''
                  },
                  preferredHostCountryCodes: b.preferredHostCountryCodes ?? []
                });
              }}
              onContinue={handleCountryContinue}
            />
          ) : null}
          {step === 'email' ? (
            <CountryEmailSignupStep
              disabled={navigatingToHub}
              submitting={navigatingToHub}
              locale={locale}
              email={email}
              countryLabel={countryLabel}
              progressEyebrow={ui.emailStepProgress}
              submitLabel={
                navigatingToHub ? ui.preparingMatches : ui.submitMatches
              }
              googleSubmitting={googleSignInPending}
              error={emailError}
              onEmailChange={(value) => {
                setEmail(value);
                setEmailError(null);
              }}
              onBack={() => setQuizStep('country')}
              onSubmit={completeCountryOnlySignup}
              onGoogleSignIn={continueWithGoogle}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
