'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getURL } from '@/utils/helpers';
import { ScholarshipOnboardingStep1 } from '@/components/onboarding/ScholarshipOnboardingStep1';
import { ScholarshipOnboardingStep2 } from '@/components/onboarding/ScholarshipOnboardingStep2';
import { ScholarshipOnboardingStep3Gpa } from '@/components/onboarding/ScholarshipOnboardingStep3Gpa';
import { ScholarshipOnboardingStep4State } from '@/components/onboarding/ScholarshipOnboardingStep4State';
import { CountryFirstStep } from '@/components/onboarding/CountryFirstStep';
import { buildCompleteScholarshipUserProfile } from '@/lib/onboarding/buildScholarshipUserProfile';
import type { OnboardingStep } from '@/lib/onboarding/onboardingFlowTypes';
import {
  clampOnboardingStepToProgress,
  defaultResumeOnboardingStep,
  normalizeOnboardingStepParam,
  onboardingStepHref
} from '@/lib/onboarding/onboardingResume';
import { parseSafeNextPath } from '@/lib/onboarding/safeNextPath';
import { applyPendingLandingQuizMergeIfNeeded } from '@/lib/onboarding/mergeLandingQuizIntoOnboardingDraft';
import {
  clearScholarshipOnboardingDraft,
  loadStoredOnboardingDraft,
  mergeDraftWithDefaults,
  saveFullOnboardingDraft,
  type OnboardingFormValues,
  type StoredOnboardingDraft
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import { enqueueRegistrationVerificationEmail } from '@/app/actions/registrationVerification';
import { syncOnboardingToProfiles } from '@/lib/onboarding/syncScholarshipProfile';
import {
  validateScholarshipOnboardingStep2,
  type Step2FormValues
} from '@/lib/validation/scholarshipOnboardingStep2Schema';
import { userFacingAuthError } from '@/lib/auth/userFacingAuthError';
import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';
import { toast } from '@/components/ui/Toasts/use-toast';
import { SCHOLARSHIPS_HUB_BEST_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';
import { normalizeCountryCode } from '@/lib/scholarships/countryEligibility/countries';

/** Default landing after onboarding: scholarship hub, Best recommendation tab. */
const POST_ONBOARDING_PATH = SCHOLARSHIPS_HUB_BEST_MATCHES_HREF;

function notifyDestructive(title: string, description?: string) {
  toast({
    variant: 'destructive',
    title,
    description
  });
}

function emptyDraft(): StoredOnboardingDraft {
  return {
    v: 7,
    activeStep: 1,
    step1: mergeDraftWithDefaults(null),
    step2: { firstName: '', lastName: '', email: '' },
    step3: { gpa: '' },
    step4: { countryCode: '', state: '' }
  };
}

function parseStepParam(raw: string | null): OnboardingStep | null {
  if (raw == null) return null;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  return normalizeOnboardingStepParam(n);
}

export type ScholarshipOnboardingWizardProps = {
  /**
   * `standalone` — `/onboarding` URL step sync (`?step=`).
   * `embedded` — local step state (e.g. landing page quiz without navigation).
   */
  mode: 'standalone' | 'embedded';
  /**
   * Post-auth redirect when `mode="embedded"`. For standalone, `?next=` or default Best tab applies.
   */
  embeddedAfterAuthPath?: string;
  /** Optional: embedded-only — return to intro (hero) from step 1. */
  onLeaveEmbeddedQuiz?: () => void;
};

export function ScholarshipOnboardingWizard({
  mode,
  embeddedAfterAuthPath = SCHOLARSHIPS_HUB_BEST_MATCHES_HREF,
  onLeaveEmbeddedQuiz
}: ScholarshipOnboardingWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested =
    mode === 'standalone' ? parseStepParam(searchParams.get('step')) : null;
  const nextQueryRaw =
    mode === 'standalone' ? searchParams.get('next') : null;
  const safeNext = useMemo(
    () => parseSafeNextPath(nextQueryRaw),
    [nextQueryRaw]
  );
  const afterAuthPath =
    mode === 'embedded'
      ? embeddedAfterAuthPath
      : (safeNext ?? POST_ONBOARDING_PATH);

  const [draft, setDraft] = useState<StoredOnboardingDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const finalizeInFlight = useRef(false);
  const [embeddedStep, setEmbeddedStep] = useState<OnboardingStep>(1);
  const [embeddedStepReady, setEmbeddedStepReady] = useState(false);
  const [countryError, setCountryError] = useState<string | null>(null);

  useEffect(() => {
    const merged = applyPendingLandingQuizMergeIfNeeded();
    setDraft(merged ?? loadStoredOnboardingDraft() ?? emptyDraft());
  }, []);

  useEffect(() => {
    void router.prefetch(afterAuthPath);
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace(afterAuthPath);
      }
    });
  }, [router, afterAuthPath]);

  useEffect(() => {
    if (mode !== 'standalone' || !draft) return;
    const target =
      requested == null
        ? defaultResumeOnboardingStep(draft)
        : clampOnboardingStepToProgress(draft, requested);
    const cur = searchParams.get('step');
    if (cur !== String(target)) {
      router.replace(onboardingStepHref(target, safeNext));
    }
  }, [draft, requested, router, searchParams, safeNext, mode]);

  useEffect(() => {
    if (mode !== 'embedded' || !draft || embeddedStepReady) return;
    setEmbeddedStep(defaultResumeOnboardingStep(draft));
    setEmbeddedStepReady(true);
  }, [draft, mode, embeddedStepReady]);

  const step: OnboardingStep = useMemo(() => {
    if (!draft) return 1;
    if (mode === 'embedded') {
      return embeddedStepReady ? embeddedStep : defaultResumeOnboardingStep(draft);
    }
    return requested == null
      ? defaultResumeOnboardingStep(draft)
      : clampOnboardingStepToProgress(draft, requested);
  }, [
    draft,
    mode,
    embeddedStep,
    embeddedStepReady,
    requested
  ]);

  const persistFull = useCallback((next: StoredOnboardingDraft) => {
    saveFullOnboardingDraft(next);
    setDraft(next);
  }, []);

  const navigateToStep = useCallback(
    (s: OnboardingStep) => {
      if (mode === 'embedded') {
        setEmbeddedStep(s);
        return;
      }
      router.push(onboardingStepHref(s, safeNext));
    },
    [mode, router, safeNext]
  );

  const handleCountryContinue = useCallback(
    (countryCodeRaw: string) => {
      const code = normalizeCountryCode(countryCodeRaw);
      if (!code) {
        setCountryError('Choose your country to continue.');
        return;
      }
      setCountryError(null);
      const base = loadStoredOnboardingDraft() ?? emptyDraft();
      const nextStep = (code === 'US' ? 2 : 7) as OnboardingStep;
      persistFull({
        ...base,
        v: 7,
        step4: {
          ...base.step4,
          countryCode: code,
          state: code === 'US' ? base.step4.state : ''
        },
        activeStep: nextStep
      });
      navigateToStep(nextStep);
    },
    [persistFull, navigateToStep]
  );

  const handleSchoolLevelContinue = useCallback(
    (values: OnboardingFormValues) => {
      const base = loadStoredOnboardingDraft() ?? emptyDraft();
      persistFull({
        ...base,
        v: 7,
        step1: values,
        activeStep: 3
      });
      navigateToStep(3);
    },
    [persistFull, navigateToStep]
  );

  const handleFieldOfStudyContinue = useCallback(
    (values: OnboardingFormValues) => {
      const base = loadStoredOnboardingDraft() ?? emptyDraft();
      persistFull({
        ...base,
        v: 7,
        step1: values,
        activeStep: 4
      });
      navigateToStep(4);
    },
    [persistFull, navigateToStep]
  );

  const handleCitizenshipContinue = useCallback(
    (values: OnboardingFormValues) => {
      const base = loadStoredOnboardingDraft() ?? emptyDraft();
      persistFull({
        ...base,
        v: 7,
        step1: values,
        activeStep: 5
      });
      navigateToStep(5);
    },
    [persistFull, navigateToStep]
  );

  const handleAfterState = useCallback(() => {
    const base = loadStoredOnboardingDraft() ?? emptyDraft();
    persistFull({
      ...base,
      v: 7,
      activeStep: 6
    });
    navigateToStep(6);
  }, [persistFull, navigateToStep]);

  const handleAfterGpa = useCallback(() => {
    const base = loadStoredOnboardingDraft() ?? emptyDraft();
    persistFull({
      ...base,
      v: 7,
      activeStep: 7
    });
    navigateToStep(7);
  }, [persistFull, navigateToStep]);

  const handleBack = useCallback(
    (s: OnboardingStep) => {
      const base = loadStoredOnboardingDraft() ?? emptyDraft();
      persistFull({ ...base, v: 7, activeStep: s });
      navigateToStep(s);
    },
    [persistFull, navigateToStep]
  );

  const finalizeOnboarding = useCallback(
    async (password: string, confirmPassword: string) => {
      if (finalizeInFlight.current) return;
      finalizeInFlight.current = true;

      const base = loadStoredOnboardingDraft() ?? emptyDraft();
      const built = buildCompleteScholarshipUserProfile(base);
      if (!built.ok) {
        finalizeInFlight.current = false;
        notifyDestructive(
          'Almost there',
          'Please complete all steps before continuing.'
        );
        return;
      }

      const authCheck = validateScholarshipOnboardingStep2({
        firstName: base.step2.firstName,
        lastName: base.step2.lastName,
        email: base.step2.email,
        password,
        confirmPassword,
        birthMonth: base.step1.birthMonth,
        birthDay: base.step1.birthDay,
        birthYear: base.step1.birthYear
      });
      if (!authCheck.ok) {
        finalizeInFlight.current = false;
        const first =
          authCheck.errors.submit ??
          authCheck.errors.email ??
          authCheck.errors.password ??
          authCheck.errors.confirmPassword ??
          authCheck.errors.firstName ??
          authCheck.errors.lastName ??
          authCheck.errors.birthMonth ??
          authCheck.errors.birthDay ??
          authCheck.errors.birthYear ??
          authCheck.errors.birthDate ??
          authCheck.errors.age ??
          'Please review your account details.';
        notifyDestructive('Check your details', first);
        return;
      }

      setLoading(true);
      try {
        const supabase = createClient();
        const email = base.step2.email.trim();
        const emailRedirectTo = getURL(
          `auth/callback?next=${encodeURIComponent(afterAuthPath)}`
        );

        const {
          data: { session: existingSession }
        } = await supabase.auth.getSession();
        let session = existingSession;
        console.info('[onboarding:auth] getSession', {
          hasSession: Boolean(existingSession?.user),
          userId: existingSession?.user?.id ?? null
        });

        const notifyTelegramRegistration = async (userId: string, userEmail: string) => {
          try {
            await fetch('/api/internal/telegram/registration', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId,
                email: userEmail,
                firstName: base.step2.firstName.trim() || null,
                source: mode === 'embedded' ? 'get-scholarships' : 'onboarding'
              })
            });
          } catch (error) {
            console.warn('[onboarding:telegram] registration notify failed', error);
          }
        };

        const syncProfileViaCountrySignup = async () => {
          const profileCountryCode = normalizeCountryCode(built.profile.countryCode);
          if (!profileCountryCode) return false;
          const res = await fetch('/api/onboarding/country-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              email,
              countryCode: profileCountryCode,
              source: mode === 'embedded' ? 'embedded-onboarding' : 'onboarding',
              profile: built.profile
            })
          });
          if (!res.ok) {
            const payload = (await res.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? 'Could not save your scholarship profile.');
          }
          return true;
        };

        const finishWithSession = async () => {
          if (!session?.user) return false;
          const userId = session.user.id;
          const addr = session.user.email?.trim() ?? null;
          const sync = await syncOnboardingToProfiles(supabase, userId, built.profile);
          if (!sync.ok) {
            setLoading(false);
            finalizeInFlight.current = false;
            notifyDestructive(
              'Could not save your profile',
              sync.error ??
                'Try again in a moment, or finish setup from your account page.'
            );
            return false;
          }
          if (addr) {
            void enqueueRegistrationVerificationEmail(addr, userId);
            void notifyTelegramRegistration(userId, addr);
          }
          clearScholarshipOnboardingDraft();
          finalizeInFlight.current = false;
          setLoading(false);
          router.refresh();
          router.push(afterAuthPath);
          return true;
        };

        if (session?.user) {
          await finishWithSession();
          return;
        }

        let signUpData: Awaited<ReturnType<typeof supabase.auth.signUp>>['data'];
        let signUpError: Awaited<ReturnType<typeof supabase.auth.signUp>>['error'];
        try {
          const scholarshipProfilePayload = JSON.stringify(built.profile);
          console.info('[onboarding:auth] signUp metadata payload', {
            builtProfile: built.profile,
            scholarship_profile_string_length: scholarshipProfilePayload.length
          });
          const result = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo,
              data: {
                scholarship_profile: scholarshipProfilePayload
              }
            }
          });
          signUpData = result.data;
          signUpError = result.error;
        } catch {
          setLoading(false);
          finalizeInFlight.current = false;
          notifyDestructive(
            'Something went wrong',
            'Check your connection and try again.'
          );
          return;
        }

        console.info('[onboarding:auth] signUp result', {
          error: signUpError?.message ?? null,
          hasSession: Boolean(signUpData.session),
          userId: signUpData.user?.id ?? null
        });

        if (signUpError) {
          console.error('[onboarding:auth] signUp error (full)', {
            message: signUpError.message,
            status: signUpError.status,
            code: signUpError.code,
            name: signUpError.name
          });
          setLoading(false);
          finalizeInFlight.current = false;
          if (signUpError.message) {
            const u = userFacingAuthError(signUpError);
            notifyDestructive(u.title, u.description);
          } else {
            notifyDestructive(
              'Something went wrong',
              'Check your connection and try again.'
            );
          }
          return;
        }

        session = signUpData.session;

        if (session?.user) {
          const ok = await finishWithSession();
          if (!ok) return;
          return;
        }

        if (signUpData.user?.id) {
          await syncProfileViaCountrySignup();
        }
        clearScholarshipOnboardingDraft();
        setLoading(false);
        finalizeInFlight.current = false;
        router.refresh();
        router.push(afterAuthPath);
      } catch (error) {
        console.error('[onboarding:auth] finalize failed unexpectedly', error);
        setLoading(false);
        finalizeInFlight.current = false;
        notifyDestructive(
          'Something went wrong',
          'Check your connection and try again.'
        );
      }
    },
    [afterAuthPath, mode, persistFull, router]
  );

  const handleAccountSubmit = useCallback(
    (payload: Step2FormValues) => {
      const base = loadStoredOnboardingDraft() ?? emptyDraft();
      persistFull({
        ...base,
        v: 7,
        step1: {
          ...base.step1,
          birthMonth: payload.birthMonth.trim(),
          birthDay: payload.birthDay.trim(),
          birthYear: payload.birthYear.trim()
        },
        step2: {
          firstName: payload.firstName.trim(),
          lastName: payload.lastName.trim(),
          email: payload.email.trim()
        },
        activeStep: 7
      });
      void finalizeOnboarding(payload.password, payload.confirmPassword);
    },
    [persistFull, finalizeOnboarding]
  );

  if (!draft) {
    return (
      <SiteBrandLoading
        label="Loading your progress…"
        className="min-h-[calc(100dvh-4rem)]"
      />
    );
  }

  const showEmbeddedLeave =
    mode === 'embedded' && typeof onLeaveEmbeddedQuiz === 'function';
  const selectedCountryCode = normalizeCountryCode(draft.step4.countryCode);
  const isUnitedStatesFlow = selectedCountryCode === 'US';

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-zinc-50 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-lg">
        {mode === 'standalone' ? (
          <Link
            href="/"
            className="mb-8 inline-block text-sm text-gray-600 no-underline transition hover:text-black hover:underline"
          >
            ← Back to home
          </Link>
        ) : null}

        {showEmbeddedLeave ? (
          <button
            type="button"
            onClick={onLeaveEmbeddedQuiz}
            className="mb-8 text-sm text-gray-600 no-underline transition hover:text-black hover:underline"
          >
            ← Back to intro
          </button>
        ) : null}

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          {step === 1 ? (
            <CountryFirstStep
              disabled={loading}
              value={draft.step4.countryCode ?? ''}
              progressEyebrow="Step 1 · Country"
              title="Where are you applying from?"
              description="Choose your applicant country first. We'll adapt the signup questions and scholarship matching to that country."
              error={countryError}
              onChange={(value) => {
                setCountryError(null);
                persistFull({
                  ...draft,
                  v: 7,
                  step4: {
                    ...draft.step4,
                    countryCode: value,
                    state: normalizeCountryCode(value) === 'US' ? draft.step4.state : ''
                  }
                });
              }}
              onContinue={() => handleCountryContinue(draft.step4.countryCode ?? '')}
            />
          ) : null}
          {step === 2 ? (
            <ScholarshipOnboardingStep1
              disabled={loading}
              initialStep1={draft.step1}
              basicStep="schoolLevel"
              progressEyebrow="Step 2 of 7 · Basics"
              title="Tell us about you"
              description="We use this to match scholarships to your background and goals."
              helperText="The more details you share, the better we can tailor scholarship matches to you."
              visualVariant="saas"
              onBack={() => handleBack(1)}
              onContinue={handleSchoolLevelContinue}
            />
          ) : null}
          {step === 3 ? (
            <ScholarshipOnboardingStep1
              disabled={loading}
              initialStep1={draft.step1}
              basicStep="fieldOfStudy"
              progressEyebrow="Step 3 of 7 · Basics"
              title="Tell us about you"
              description="We use this to match scholarships to your background and goals."
              helperText="The more details you share, the better we can tailor scholarship matches to you."
              visualVariant="saas"
              onBack={() => handleBack(2)}
              onContinue={handleFieldOfStudyContinue}
            />
          ) : null}
          {step === 4 ? (
            <ScholarshipOnboardingStep1
              disabled={loading}
              initialStep1={draft.step1}
              basicStep="citizenship"
              progressEyebrow="Step 4 of 7 · Basics"
              title="Tell us about you"
              description="We use this to match scholarships to your background and goals."
              helperText="The more details you share, the better we can tailor scholarship matches to you."
              visualVariant="saas"
              onBack={() => handleBack(3)}
              onContinue={handleCitizenshipContinue}
            />
          ) : null}
          {step === 5 ? (
            <ScholarshipOnboardingStep4State
              disabled={loading}
              initialStep4={draft.step4}
              progressEyebrow="Step 5 of 7 · State"
              visualVariant="saas"
              onBack={() => handleBack(4)}
              onContinue={handleAfterState}
            />
          ) : null}
          {step === 6 ? (
            <ScholarshipOnboardingStep3Gpa
              disabled={loading}
              initialStep3={draft.step3}
              progressEyebrow="Step 6 of 7 · GPA"
              visualVariant="saas"
              onBack={() => handleBack(5)}
              onContinue={handleAfterGpa}
            />
          ) : null}
          {step === 7 ? (
            <ScholarshipOnboardingStep2
              disabled={loading}
              isSubmitting={loading}
              initialStep1={draft.step1}
              initialStep2={draft.step2}
              progressEyebrow={
                isUnitedStatesFlow ? 'Step 7 of 7 · Account' : 'Step 2 of 2 · Account'
              }
              visualVariant="saas"
              onBack={() => handleBack(isUnitedStatesFlow ? 6 : 1)}
              onContinue={handleAccountSubmit}
              oauthRedirectAfterAuthPath={afterAuthPath}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
