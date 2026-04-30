'use client';

import { useState } from 'react';
import { ArrowRight, BrainCircuit, Mail } from 'lucide-react';

import AssessmentEngine from '@/components/iq/AssessmentEngine';
import StandardIqPaywall from '@/components/iq/StandardIqPaywall';
import IqProductFooter from '@/components/iq/IqProductFooter';
import type { AssessmentResult } from '@/lib/iqAssessmentTypes';

import ScholarshipIqTestClient from './ScholarshipIqTestClient';

type GeneralFunnelPhase = 'landing' | 'assessment' | 'email' | 'paywall';

export default function GeneralIqFunnelClient() {
  const [phase, setPhase] = useState<GeneralFunnelPhase>('landing');
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [email, setEmail] = useState('');

  const restartAssessment = () => {
    try {
      window.localStorage.removeItem('iq_general_assessment:v1');
    } catch {
      // Ignore storage failures.
    }
    setResult(null);
    setPhase('assessment');
  };

  if (phase === 'email') {
    return (
      <IqReportEmailGate
        email={email}
        onEmailChange={setEmail}
        onContinue={() => setPhase('assessment')}
      />
    );
  }

  if (phase === 'assessment') {
    return (
      <AssessmentEngine
        storageKey="iq_general_assessment:v1"
        startImmediately
        onComplete={(assessmentResult) => {
          setResult(assessmentResult);
          setPhase('paywall');
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
    <ScholarshipIqTestClient onStartAssessment={() => setPhase('email')} />
  );
}

function IqReportEmailGate({
  email,
  onEmailChange,
  onContinue
}: {
  email: string;
  onEmailChange: (email: string) => void;
  onContinue: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    onEmailChange(normalized);
    onContinue();
  }

  return (
    <main className="iq-product-shell min-h-screen bg-[radial-gradient(circle_at_15%_8%,#dbeafe_0,transparent_30%),radial-gradient(circle_at_85%_12%,#e0e7ff_0,transparent_30%),#F8FAFC] text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center px-6 py-12">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-[0_28px_90px_-42px_rgba(15,23,42,0.5)] sm:p-8"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <BrainCircuit className="h-7 w-7" aria-hidden />
          </div>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
            Start your private report
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Where should we send your IQ profile?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
            Enter your email before the test. If you unlock the full report
            after the assessment, your private access link will be sent here.
          </p>

          <label className="mx-auto mt-8 block max-w-md text-left">
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 ring-1 ring-transparent transition focus-within:border-slate-400 focus-within:bg-white focus-within:ring-slate-200">
              <Mail className="h-5 w-5 text-slate-400" aria-hidden />
              <input
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-950 outline-none placeholder:text-slate-400"
              />
            </span>
          </label>
          {error ? (
            <p className="mx-auto mt-3 max-w-md rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="group mt-7 inline-flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            Continue to IQ test
            <ArrowRight
              className="h-4 w-4 transition group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
          <p className="mx-auto mt-4 max-w-md text-xs leading-5 text-slate-500">
            No account required to start. We use your email to keep report access
            tied to you if you decide to unlock it.
          </p>
        </form>
      </section>
      <IqProductFooter />
    </main>
  );
}
