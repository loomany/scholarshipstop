'use client';

import { useEffect, useState } from 'react';

import AssessmentEngine from '@/components/iq/AssessmentEngine';
import StandardIqPaywall from '@/components/iq/StandardIqPaywall';
import IqProductFooter from '@/components/iq/IqProductFooter';
import type { AssessmentResult } from '@/lib/iqAssessmentTypes';
import { CountryEmailSignupStep } from '@/components/onboarding/CountryEmailSignupStep';
import { CountryFirstStep } from '@/components/onboarding/CountryFirstStep';
import { createCountryFirstScholarshipAccount } from '@/lib/onboarding/countryFirstSignupClient';
import {
  countryLabelFromCode,
  normalizeCountryCode
} from '@/lib/scholarships/countryEligibility/countries';

import ScholarshipIqTestClient from './ScholarshipIqTestClient';

type GeneralFunnelPhase = 'landing' | 'country' | 'assessment' | 'email' | 'paywall';

const GENERAL_ASSESSMENT_STORAGE_KEY = 'iq_general_assessment:v1';
const GENERAL_FUNNEL_PHASE_STORAGE_KEY = 'iq_general_funnel_phase:v1';
const GENERAL_COUNTRY_STORAGE_KEY = 'iq_general_country:v1';
const GENERAL_EMAIL_STORAGE_KEY = 'iq_general_email:v1';
const GENERAL_RESULT_STORAGE_KEY = 'iq_general_result:v1';

function isGeneralFunnelPhase(value: unknown): value is GeneralFunnelPhase {
  return (
    value === 'landing' ||
    value === 'country' ||
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
  const [countryCode, setCountryCode] = useState('');
  const [countryError, setCountryError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submittingAccount, setSubmittingAccount] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedPhaseRaw = window.localStorage.getItem(
      GENERAL_FUNNEL_PHASE_STORAGE_KEY
    );
    const storedPhase = isGeneralFunnelPhase(storedPhaseRaw) ? storedPhaseRaw : null;
    const storedCountry = window.localStorage.getItem(GENERAL_COUNTRY_STORAGE_KEY) ?? '';
    const storedEmail = window.localStorage.getItem(GENERAL_EMAIL_STORAGE_KEY) ?? '';
    const storedResult = readJsonStorage<AssessmentResult>(GENERAL_RESULT_STORAGE_KEY);
    const hasAssessmentDraft = Boolean(
      readJsonStorage<unknown>(GENERAL_ASSESSMENT_STORAGE_KEY)
    );

    if (storedCountry) setCountryCode(storedCountry);
    if (storedEmail) setEmail(storedEmail);
    if (storedResult) setResult(storedResult);

    if (storedPhase === 'paywall' && storedResult) {
      setPhase('paywall');
    } else if (storedPhase === 'assessment' || hasAssessmentDraft) {
      setPhase('assessment');
    } else if (storedPhase === 'email') {
      setPhase('email');
    } else if (storedPhase === 'country') {
      setPhase('country');
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

  const updateCountry = (nextCountry: string) => {
    setCountryCode(nextCountry);
    writeTextStorage(GENERAL_COUNTRY_STORAGE_KEY, nextCountry);
  };

  const restartAssessment = () => {
    try {
      window.localStorage.removeItem(GENERAL_ASSESSMENT_STORAGE_KEY);
      window.localStorage.removeItem(GENERAL_RESULT_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
    setResult(null);
    transitionPhase('assessment');
  };

  const continueFromCountry = () => {
    const normalized = normalizeCountryCode(countryCode);
    if (!normalized) {
      setCountryError('Choose your country to continue.');
      return;
    }
    setCountryError(null);
    updateCountry(normalized);
    transitionPhase('email');
  };

  const continueFromEmail = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    const normalizedCountry = normalizeCountryCode(countryCode);
    if (!normalizedCountry) {
      setEmailError('Choose your country first.');
      transitionPhase('country');
      return;
    }
    setSubmittingAccount(true);
    setEmailError(null);
    updateEmail(normalizedEmail);
    const signup = await createCountryFirstScholarshipAccount({
      email: normalizedEmail,
      countryCode: normalizedCountry,
      source: 'iq-general',
      profile: { onboardingCompleted: false }
    });
    setSubmittingAccount(false);
    if (!signup.ok) {
      setEmailError(signup.error);
      return;
    }
    transitionPhase('assessment');
  };

  if (!hydrated) {
    return (
      <main className="iq-product-shell min-h-screen bg-[#F8FAFC] text-slate-950" />
    );
  }

  if (phase === 'country') {
    return (
      <main className="iq-product-shell min-h-screen bg-[radial-gradient(circle_at_15%_8%,#dbeafe_0,transparent_30%),radial-gradient(circle_at_85%_12%,#e0e7ff_0,transparent_30%),#F8FAFC] text-slate-950">
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center px-6 py-12">
          <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.5)] sm:p-8">
            <CountryFirstStep
              value={countryCode}
              progressEyebrow="Step 1 · Country"
              title="Where are you applying from?"
              description="Choose your country first so your IQ profile can connect to scholarship matches that fit your eligibility."
              error={countryError}
              onChange={(value) => {
                updateCountry(value);
                setCountryError(null);
              }}
              onContinue={continueFromCountry}
            />
          </div>
        </section>
        <IqProductFooter />
      </main>
    );
  }

  if (phase === 'email') {
    return (
      <main className="iq-product-shell min-h-screen bg-[radial-gradient(circle_at_15%_8%,#dbeafe_0,transparent_30%),radial-gradient(circle_at_85%_12%,#e0e7ff_0,transparent_30%),#F8FAFC] text-slate-950">
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center px-6 py-12">
          <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.5)] sm:p-8">
            <CountryEmailSignupStep
              email={email}
              countryLabel={countryCode ? countryLabelFromCode(countryCode) : 'your country'}
              progressEyebrow="Step 2 · Email"
              title="Where should we save your IQ profile?"
              description="No password needed now. We will save your profile, send a confirmation link, and continue to the IQ test."
              submitLabel="Continue to IQ test"
              error={emailError}
              submitting={submittingAccount}
              onEmailChange={(value) => {
                updateEmail(value);
                setEmailError(null);
              }}
              onBack={() => transitionPhase('country')}
              onSubmit={() => void continueFromEmail()}
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
    <ScholarshipIqTestClient onStartAssessment={() => transitionPhase('country')} />
  );
}
