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
    step4: { state: '' }
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

  useEffect(() => {
    const merged = applyPendingLandingQuizMergeIfNeeded();
    setDraft(merged ?? loadStoredOnboardingDraft() ?? emptyDraft());
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

  const handleSchoolLevelContinue = useCallback(
    (values: OnboardingFormValues) => {
      const base = loadStoredOnboardingDraft() ?? emptyDraft();
      persistFull({
        ...base,
        v: 7,
        step1: values,
        activeStep: 2
      });
      navigateToStep(2);
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
        activeStep: 3
      });
      navigateToStep(3);
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
        activeStep: 4
      });
      navigateToStep(4);
    },
    [persistFull, navigateToStep]
  );

  const handleAfterState = useCallback(() => {
    const base = loadStoredOnboardingDraft() ?? emptyDraft();
    persistFull({
      ...base,
      v: 7,
      activeStep: 5
    });
    navigateToStep(5);
  }, [persistFull, navigateToStep]);

  const handleAfterGpa = useCallback(() => {
    const base = loadStoredOnboardingDraft() ?? emptyDraft();
    persistFull({
      ...base,
      v: 7,
      activeStep: 6
    });
    navigateToStep(6);
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

      const finishWithSession = async () => {
        if (!session?.user) return false;
        const sync = await syncOnboardingToProfiles(
          supabase,
          session.user.id,
          built.profile
        );
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
        const addr = session.user.email?.trim();
        if (addr) {
          void enqueueRegistrationVerificationEmail(addr, session.user.id);
          void notifyTelegramRegistration(session.user.id, addr);
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

      clearScholarshipOnboardingDraft();
      setLoading(false);
      finalizeInFlight.current = false;
      router.refresh();
      router.push(afterAuthPath);
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
        activeStep: 6
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
            <ScholarshipOnboardingStep1
              disabled={loading}
              initialStep1={draft.step1}
              basicStep="schoolLevel"
              progressEyebrow="Step 1 of 6 · Basics"
              title="Tell us about you"
              description="We use this to match scholarships to your background and goals."
              helperText="The more details you share, the better we can tailor scholarship matches to you."
              onContinue={handleSchoolLevelContinue}
            />
          ) : null}
          {step === 2 ? (
            <ScholarshipOnboardingStep1
              disabled={loading}
              initialStep1={draft.step1}
              basicStep="fieldOfStudy"
              progressEyebrow="Step 2 of 6 · Basics"
              title="Tell us about you"
              description="We use this to match scholarships to your background and goals."
              helperText="The more details you share, the better we can tailor scholarship matches to you."
              onBack={() => handleBack(1)}
              onContinue={handleFieldOfStudyContinue}
            />
          ) : null}
          {step === 3 ? (
            <ScholarshipOnboardingStep1
              disabled={loading}
              initialStep1={draft.step1}
              basicStep="citizenship"
              progressEyebrow="Step 3 of 6 · Basics"
              title="Tell us about you"
              description="We use this to match scholarships to your background and goals."
              helperText="The more details you share, the better we can tailor scholarship matches to you."
              onBack={() => handleBack(2)}
              onContinue={handleCitizenshipContinue}
            />
          ) : null}
          {step === 4 ? (
            <ScholarshipOnboardingStep4State
              disabled={loading}
              initialStep4={draft.step4}
              progressEyebrow="Step 4 of 6 · State"
              onBack={() => handleBack(3)}
              onContinue={handleAfterState}
            />
          ) : null}
          {step === 5 ? (
            <ScholarshipOnboardingStep3Gpa
              disabled={loading}
              initialStep3={draft.step3}
              progressEyebrow="Step 5 of 6 · GPA"
              onBack={() => handleBack(4)}
              onContinue={handleAfterGpa}
            />
          ) : null}
          {step === 6 ? (
            <ScholarshipOnboardingStep2
              disabled={loading}
              isSubmitting={loading}
              initialStep1={draft.step1}
              initialStep2={draft.step2}
              progressEyebrow="Step 6 of 6 · Account"
              onBack={() => handleBack(5)}
              onContinue={handleAccountSubmit}
              oauthRedirectAfterAuthPath={afterAuthPath}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
