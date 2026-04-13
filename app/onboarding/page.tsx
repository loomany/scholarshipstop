'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  clearScholarshipOnboardingDraft,
  loadStoredOnboardingDraft,
  mergeDraftWithDefaults,
  saveFullOnboardingDraft,
  type OnboardingFormValues,
  type StoredOnboardingDraft
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import { enqueueRegistrationVerificationEmail } from '@/app/actions/registrationVerification';
import { SCHOLARSHIPS_HUB_ALL_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';
import { syncOnboardingToProfiles } from '@/lib/onboarding/syncScholarshipProfile';
import { validateScholarshipOnboardingStep2 } from '@/lib/validation/scholarshipOnboardingStep2Schema';
import { userFacingAuthError } from '@/lib/auth/userFacingAuthError';
import { toast } from '@/components/ui/Toasts/use-toast';

const POST_ONBOARDING_PATH = SCHOLARSHIPS_HUB_ALL_MATCHES_HREF;

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

function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = parseStepParam(searchParams.get('step'));
  const nextQueryRaw = searchParams.get('next');
  const safeNext = useMemo(
    () => parseSafeNextPath(nextQueryRaw),
    [nextQueryRaw]
  );
  const afterAuthPath = safeNext ?? POST_ONBOARDING_PATH;

  const [draft, setDraft] = useState<StoredOnboardingDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const finalizeInFlight = useRef(false);
  useEffect(() => {
    setDraft(loadStoredOnboardingDraft() ?? emptyDraft());
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
    if (!draft) return;
    const target =
      requested == null
        ? defaultResumeOnboardingStep(draft)
        : clampOnboardingStepToProgress(draft, requested);
    const cur = searchParams.get('step');
    if (cur !== String(target)) {
      router.replace(onboardingStepHref(target, safeNext));
    }
  }, [draft, requested, router, searchParams, safeNext]);

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
      router.push(onboardingStepHref(2, safeNext));
    },
    [persistFull, router, safeNext]
  );

  const handleAfterState = useCallback(() => {
    const base = loadStoredOnboardingDraft() ?? emptyDraft();
    persistFull({
      ...base,
      v: 7,
      activeStep: 3
    });
    router.push(onboardingStepHref(3, safeNext));
  }, [persistFull, router, safeNext]);

  const handleAfterGpa = useCallback(() => {
    const base = loadStoredOnboardingDraft() ?? emptyDraft();
    persistFull({
      ...base,
      v: 7,
      activeStep: 4
    });
    router.push(onboardingStepHref(4, safeNext));
  }, [persistFull, router, safeNext]);

  const handleBack = useCallback(
    (s: OnboardingStep) => {
      const base = loadStoredOnboardingDraft() ?? emptyDraft();
      persistFull({ ...base, v: 7, activeStep: s });
      router.push(onboardingStepHref(s, safeNext));
    },
    [persistFull, router, safeNext]
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
              source: 'onboarding'
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
        // GoTrue often omits nested objects from raw_user_meta_data; a JSON string is stored reliably.
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
    [afterAuthPath, persistFull, router]
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
              isSubmitting={loading}
              initialStep2={draft.step2}
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
