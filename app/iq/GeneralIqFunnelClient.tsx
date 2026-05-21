'use client';

import { useEffect, useState } from 'react';

import { notifyIqReportEmailCaptured } from '@/app/actions/iqReportCheckout';
import AssessmentEngine from '@/components/iq/AssessmentEngine';
import StandardIqPaywall from '@/components/iq/StandardIqPaywall';
import IqProductFooter from '@/components/iq/IqProductFooter';
import type { AssessmentResult } from '@/lib/iqAssessmentTypes';
import { CountryEmailSignupStep } from '@/components/onboarding/CountryEmailSignupStep';
import { createClient } from '@/utils/supabase/client';
import { getOAuthCallbackUrlWithNext } from '@/utils/helpers';

import ScholarshipIqTestClient from './ScholarshipIqTestClient';

type GeneralFunnelPhase = 'landing' | 'assessment' | 'email' | 'paywall';

const GENERAL_ASSESSMENT_STORAGE_KEY = 'iq_general_assessment:v2';
const GENERAL_FUNNEL_PHASE_STORAGE_KEY = 'iq_general_funnel_phase:v1';
const GENERAL_EMAIL_STORAGE_KEY = 'iq_general_email:v1';
const GENERAL_RESULT_STORAGE_KEY = 'iq_general_result:v1';

function isGeneralFunnelPhase(value: unknown): value is GeneralFunnelPhase {
  return (
    value === 'landing' ||
    value === 'assessment' ||
    value === 'email' ||
    value === 'paywall'
  );
}

function readJsonStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}

function writeTextStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures.
  }
}

export default function GeneralIqFunnelClient() {
  const [phase, setPhase] = useState<GeneralFunnelPhase>('landing');
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [googleSignInPending, setGoogleSignInPending] = useState(false);

  useEffect(() => {
    const storedPhaseRaw = window.localStorage.getItem(
      GENERAL_FUNNEL_PHASE_STORAGE_KEY
    );
    const storedPhase = isGeneralFunnelPhase(storedPhaseRaw) ? storedPhaseRaw : null;
    const storedEmail = window.localStorage.getItem(GENERAL_EMAIL_STORAGE_KEY) ?? '';
    const storedResult = readJsonStorage<AssessmentResult>(GENERAL_RESULT_STORAGE_KEY);
    const hasAssessmentDraft = Boolean(
      readJsonStorage<unknown>(GENERAL_ASSESSMENT_STORAGE_KEY)
    );

    if (storedEmail) setEmail(storedEmail);
    if (storedResult) setResult(storedResult);

    if (storedPhase === 'paywall' && storedResult) {
      setPhase('paywall');
    } else if (storedPhase === 'assessment' || hasAssessmentDraft) {
      setPhase('assessment');
    } else if (storedPhase === 'email') {
      setPhase('email');
    } else if (storedPhaseRaw === 'country') {
      setPhase('email');
    } else {
      setPhase('landing');
    }

    setHydrated(true);
  }, []);

  const transitionPhase = (nextPhase: GeneralFunnelPhase) => {
    setPhase(nextPhase);
    writeTextStorage(GENERAL_FUNNEL_PHASE_STORAGE_KEY, nextPhase);
  };

  const updateEmail = (nextEmail: string) => {
    setEmail(nextEmail);
    writeTextStorage(GENERAL_EMAIL_STORAGE_KEY, nextEmail);
  };

  const restartAssessment = () => {
    try {
      window.localStorage.removeItem(GENERAL_ASSESSMENT_STORAGE_KEY);
      window.localStorage.removeItem(GENERAL_RESULT_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
    setResult(null);
    transitionPhase('email');
  };

  const continueFromEmail = () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError(null);
    updateEmail(normalizedEmail);
    transitionPhase('assessment');
  };

  const continueWithGoogle = async () => {
    setEmailError(null);
    setGoogleSignInPending(true);
    writeTextStorage(GENERAL_FUNNEL_PHASE_STORAGE_KEY, 'assessment');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthCallbackUrlWithNext('/iq')
        }
      });
      if (error) {
        setGoogleSignInPending(false);
        setEmailError(error.message || 'Google sign-in failed.');
      }
    } catch {
      setGoogleSignInPending(false);
      setEmailError('Google sign-in failed. Try again in a moment.');
    }
  };

  if (!hydrated) {
    return (
      <main className="iq-product-shell min-h-screen bg-[#F8FAFC] text-slate-950" />
    );
  }

  if (phase === 'email') {
    return (
      <main className="iq-product-shell min-h-screen bg-[radial-gradient(circle_at_15%_8%,#dbeafe_0,transparent_30%),radial-gradient(circle_at_85%_12%,#e0e7ff_0,transparent_30%),#F8FAFC] text-slate-950">
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center px-6 py-12">
          <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.5)] sm:p-8">
            <CountryEmailSignupStep
              email={email}
              countryLabel=""
              progressEyebrow="Step 1 · Email"
              title="Where should we save your IQ profile?"
              description="Enter your email to continue to the IQ test. You can use the same email again anytime; after payment we will send your full report and private result link."
              submitLabel="Continue to IQ test"
              googleSubmitting={googleSignInPending}
              error={emailError}
              onEmailChange={(value) => {
                updateEmail(value);
                setEmailError(null);
              }}
              onSubmit={continueFromEmail}
              onGoogleSignIn={continueWithGoogle}
            />
          </div>
        </section>
        <IqProductFooter />
      </main>
    );
  }

  if (phase === 'assessment') {
    return (
      <AssessmentEngine
        storageKey={GENERAL_ASSESSMENT_STORAGE_KEY}
        startImmediately
        onComplete={(assessmentResult) => {
          setResult(assessmentResult);
          writeJsonStorage(GENERAL_RESULT_STORAGE_KEY, assessmentResult);
          void notifyIqReportEmailCaptured({
            email: email.trim().toLowerCase(),
            result: assessmentResult
          }).catch((notifyError) => {
            console.warn('[iq:telegram] iq email capture notify failed', notifyError);
          });
          transitionPhase('paywall');
        }}
      />
    );
  }

  if (phase === 'paywall' && result) {
    return (
      <StandardIqPaywall
        result={result}
        email={email}
        onRestart={restartAssessment}
      />
    );
  }

  return (
    <ScholarshipIqTestClient onStartAssessment={() => transitionPhase('email')} />
  );
}
