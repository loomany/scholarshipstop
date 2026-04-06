'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
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
import {
  clearScholarshipOnboardingDraft,
  loadStoredOnboardingDraft,
  mergeDraftWithDefaults,
  saveFullOnboardingDraft,
  type OnboardingFormValues,
  type StoredOnboardingDraft
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import { isEmailAlreadyRegisteredMessage } from '@/lib/onboarding/onboardingAuthErrors';
import { syncOnboardingToProfiles } from '@/lib/onboarding/syncScholarshipProfile';
import { validateScholarshipOnboardingStep2 } from '@/lib/validation/scholarshipOnboardingStep2Schema';

const POST_ONBOARDING_PATH = '/scholarships';

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

function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = parseStepParam(searchParams.get('step'));

  const [draft, setDraft] = useState<StoredOnboardingDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [finalError, setFinalError] = useState<string | null>(null);
  const finalizeInFlight = useRef(false);
  useEffect(() => {
    setDraft(loadStoredOnboardingDraft() ?? emptyDraft());
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace(POST_ONBOARDING_PATH);
      }
    });
  }, [router]);

  useEffect(() => {
    if (!draft) return;
    const target =
      requested == null
        ? defaultResumeOnboardingStep(draft)
        : clampOnboardingStepToProgress(draft, requested);
    const cur = searchParams.get('step');
    if (cur !== String(target)) {
      router.replace(onboardingStepHref(target));
    }
  }, [draft, requested, router, searchParams]);

  const step: OnboardingStep = draft
    ? requested == null
      ? defaultResumeOnboardingStep(draft)
      : clampOnboardingStepToProgress(draft, requested)
    : 1;

  const persistFull = useCallback((next: StoredOnboardingDraft) => {
    saveFullOnboardingDraft(next);
    setDraft(next);
  }, []);

  const handleStep1Continue = useCallback(
    (values: OnboardingFormValues) => {
      const base = loadStoredOnboardingDraft() ?? emptyDraft();
      persistFull({
        ...base,
        v: 7,
        step1: values,
        activeStep: 2
      });
      router.push(onboardingStepHref(2));
    },
    [persistFull, router]
  );

  const handleAfterState = useCallback(() => {
    const base = loadStoredOnboardingDraft() ?? emptyDraft();
    persistFull({
      ...base,
      v: 7,
      activeStep: 3
    });
    router.push(onboardingStepHref(3));
  }, [persistFull, router]);

  const handleAfterGpa = useCallback(() => {
    const base = loadStoredOnboardingDraft() ?? emptyDraft();
    persistFull({
      ...base,
      v: 7,
      activeStep: 4
    });
    router.push(onboardingStepHref(4));
  }, [persistFull, router]);

  const handleBack = useCallback(
    (s: OnboardingStep) => {
      const base = loadStoredOnboardingDraft() ?? emptyDraft();
      persistFull({ ...base, v: 7, activeStep: s });
      router.push(onboardingStepHref(s));
    },
    [persistFull, router]
  );

  const finalizeOnboarding = useCallback(
    async (password: string, confirmPassword: string) => {
      if (finalizeInFlight.current) return;
      finalizeInFlight.current = true;
      setFinalError(null);

      const base = loadStoredOnboardingDraft() ?? emptyDraft();
      const built = buildCompleteScholarshipUserProfile(base);
      if (!built.ok) {
        finalizeInFlight.current = false;
        setFinalError('Please complete all steps before continuing.');
        return;
      }

      const authCheck = validateScholarshipOnboardingStep2({
        firstName: base.step2.firstName,
        lastName: base.step2.lastName,
        email: base.step2.email,
        password,
        confirmPassword
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
          'Please review your account details.';
        setFinalError(first);
        return;
      }

      setLoading(true);
      const supabase = createClient();
      const email = base.step2.email.trim();
      const callbackUrl = getURL(
        `auth/callback?next=${encodeURIComponent(POST_ONBOARDING_PATH)}`
      );

      const {
        data: { session: existingSession }
      } = await supabase.auth.getSession();
      let session = existingSession;
      console.info('[onboarding:auth] getSession', {
        hasSession: Boolean(existingSession?.user),
        userId: existingSession?.user?.id ?? null
      });

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
          setFinalError(
            sync.error ??
              'We could not save your profile. Check your database columns or try again from Account.'
          );
          return false;
        }
        clearScholarshipOnboardingDraft();
        finalizeInFlight.current = false;
        setLoading(false);
        router.refresh();
        router.push(POST_ONBOARDING_PATH);
        return true;
      };

      if (session?.user) {
        await finishWithSession();
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callbackUrl
        }
      });

      console.info('[onboarding:auth] signUp result', {
        error: signUpError?.message ?? null,
        hasSession: Boolean(signUpData.session),
        userId: signUpData.user?.id ?? null
      });

      if (signUpError) {
        if (isEmailAlreadyRegisteredMessage(signUpError.message)) {
          const signIn = await supabase.auth.signInWithPassword({
            email,
            password
          });
          console.info('[onboarding:auth] signIn (email already registered)', {
            error: signIn.error?.message ?? null,
            hasSession: Boolean(signIn.data.session),
            userId: signIn.data.session?.user?.id ?? null
          });
          if (signIn.error) {
            setLoading(false);
            finalizeInFlight.current = false;
            setFinalError(
              signIn.error.message ||
                'This email is already registered. Sign in with your password or reset it.'
            );
            return;
          }
          session = signIn.data.session;
          const ok = await finishWithSession();
          if (!ok) return;
          return;
        }
        setLoading(false);
        finalizeInFlight.current = false;
        setFinalError(signUpError.message);
        return;
      }

      session = signUpData.session;
      if (!session?.user && signUpData.user) {
        const signIn = await supabase.auth.signInWithPassword({
          email,
          password
        });
        console.info('[onboarding:auth] signIn after signup (no immediate session)', {
          error: signIn.error?.message ?? null,
          hasSession: Boolean(signIn.data.session),
          userId: signIn.data.session?.user?.id ?? null
        });
        if (!signIn.error) {
          session = signIn.data.session;
        }
      }

      if (session?.user) {
        const ok = await finishWithSession();
        if (!ok) return;
        return;
      }

      setLoading(false);
      finalizeInFlight.current = false;
      setFinalError(
        'No active session after signup. In the Supabase dashboard, open Authentication → Providers → Email and disable “Confirm email” so new users are signed in immediately. Then try again, or use Sign In if you already have an account.'
      );
    },
    [router]
  );

  const handleAccountSubmit = useCallback(
    (payload: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      confirmPassword: string;
    }) => {
      const base = loadStoredOnboardingDraft() ?? emptyDraft();
      persistFull({
        ...base,
        v: 7,
        step2: {
          firstName: payload.firstName.trim(),
          lastName: payload.lastName.trim(),
          email: payload.email.trim()
        },
        activeStep: 4
      });
      void finalizeOnboarding(payload.password, payload.confirmPassword);
    },
    [persistFull, finalizeOnboarding]
  );

  if (!draft) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-zinc-50 px-4">
        <p className="text-sm text-zinc-600">Loading your progress…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-zinc-50 px-4 py-10 sm:py-14">
      {loading ? (
        <div
          className="fixed inset-0 z-[115] flex flex-col items-center justify-center bg-white/90 px-6 backdrop-blur-md"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="mx-auto max-w-sm text-center">
            <div
              className="mx-auto mb-8 h-10 w-10 animate-pulse rounded-full border-2 border-orange-500 bg-zinc-900 shadow-[0_6px_24px_-6px_rgba(0,0,0,0.35)]"
              aria-hidden
            />
            <p className="text-sm font-medium text-zinc-700 sm:text-base">
              Creating account &amp; saving profile…
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-lg">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-gray-600 no-underline transition hover:text-black hover:underline"
        >
          ← Back to home
        </Link>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          {step === 1 ? (
            <ScholarshipOnboardingStep1
              disabled={loading}
              initialStep1={draft.step1}
              onContinue={handleStep1Continue}
            />
          ) : null}
          {step === 2 ? (
            <ScholarshipOnboardingStep4State
              disabled={loading}
              initialStep4={draft.step4}
              onBack={() => handleBack(1)}
              onContinue={handleAfterState}
            />
          ) : null}
          {step === 3 ? (
            <ScholarshipOnboardingStep3Gpa
              disabled={loading}
              initialStep3={draft.step3}
              onBack={() => handleBack(2)}
              onContinue={handleAfterGpa}
            />
          ) : null}
          {step === 4 ? (
            <ScholarshipOnboardingStep2
              disabled={loading}
              initialStep2={draft.step2}
              submitError={finalError}
              onBack={() => handleBack(3)}
              onContinue={handleAccountSubmit}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-zinc-50">
          <p className="text-sm text-zinc-600">Loading…</p>
        </div>
      }
    >
      <OnboardingWizard />
    </Suspense>
  );
}
