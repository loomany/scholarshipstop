'use client';

import { useEffect, useState, useTransition } from 'react';
import { ArrowRight, BrainCircuit, CheckCircle2, Lock, Sparkles } from 'lucide-react';

import { getIqReportCheckoutURL } from '@/app/actions/iqReportCheckout';
import IqProductFooter from '@/components/iq/IqProductFooter';
import UnlockedIqReport from '@/components/iq/UnlockedIqReport';
import type { AssessmentResult } from '@/lib/iqAssessmentTypes';

type StandardIqPaywallProps = {
  result: AssessmentResult;
  email: string;
  funnel?: 'standalone_iq' | 'contextual_iq_assessment';
  onRestart?: () => void;
};

export default function StandardIqPaywall({
  result,
  email,
  funnel = 'standalone_iq',
  onRestart
}: StandardIqPaywallProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localPreviewUnlocked, setLocalPreviewUnlocked] = useState(false);
  const topDomains = [...result.domainScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  useEffect(() => {
    const hostname = window.location.hostname.toLowerCase();
    setLocalPreviewUnlocked(hostname === 'localhost' || hostname === '127.0.0.1');
  }, []);

  if (localPreviewUnlocked) {
    return <UnlockedIqReport result={result} onRestart={onRestart} localPreview />;
  }

  function handleCheckout() {
    setError(null);
    startTransition(async () => {
      const checkout = await getIqReportCheckoutURL({ email, result, funnel });
      if (!checkout.ok) {
        setError(checkout.error);
        return;
      }
      window.location.assign(checkout.url);
    });
  }

  return (
    <main className="iq-product-shell min-h-screen bg-[radial-gradient(circle_at_15%_8%,#dbeafe_0,transparent_30%),radial-gradient(circle_at_85%_12%,#e0e7ff_0,transparent_30%),#F8FAFC] text-slate-950">
      <div className="px-3 py-6 sm:px-6 sm:py-14 lg:py-16">
        <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_90px_-42px_rgba(15,23,42,0.5)] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="p-5 text-center sm:p-8 lg:p-10 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-indigo-700 ring-1 ring-indigo-100">
              <BrainCircuit className="h-4 w-4" aria-hidden />
              IQ report ready
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:mt-6 sm:text-5xl">
              Your cognitive report has been generated.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600 lg:mx-0 lg:mt-4">
              Your 30 timed answers produced an IQ-style score, percentile context,
              five-domain profile, and Brain Archetype. Unlock the full report for
              a one-time $9.99 payment.
            </p>

            <div className="hidden lg:block">
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <LockedResultCard label="IQ-style score" />
                <LockedResultCard label="Brain Archetype" />
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-bold text-slate-950">Preview included</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Your assessment is complete. The exact score, archetype, domain
                  interpretation, and strength profile are prepared behind the
                  unlock screen.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-3 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-sm sm:rounded-[1.75rem] sm:p-5">
              <div className="pointer-events-none select-none opacity-35 blur-[5px]">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                    Domain preview
                  </p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Locked
                  </span>
                </div>
                <div className="mt-5 space-y-4">
                  {topDomains.map((item, index) => (
                    <div key={item.domain}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                        <span>{item.label}</span>
                        <span>{92 - index * 7}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                        <div
                          className="h-full rounded-full bg-slate-950"
                          style={{ width: `${82 - index * 9}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/70 to-white" />

              <div className="relative z-10 mt-2 w-full rounded-[1.45rem] border border-slate-200 bg-white/95 p-5 text-center shadow-[0_24px_70px_-34px_rgba(15,23,42,0.65)] backdrop-blur-md sm:mt-3 sm:rounded-[1.5rem] sm:p-6 lg:text-left">
                <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-start">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Lock className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                      Full interpretation locked
                    </p>
                    <h2 className="mt-2 text-[1.7rem] font-semibold leading-tight tracking-tight text-slate-950 sm:text-3xl lg:text-2xl">
                      Unlock your complete IQ profile
                    </h2>
                    <p className="mx-auto mt-3 max-w-sm text-base leading-7 text-slate-600 lg:mx-0 lg:text-sm lg:leading-6">
                      Reveal your exact score context, domain ranking, Brain
                      Archetype, strengths profile, and plain-English explanation.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-2 text-sm font-semibold text-slate-700">
                  {[
                    'Exact IQ-style score band and percentile context',
                    'Five-domain breakdown with strongest area',
                    'Brain Archetype and strengths interpretation'
                  ].map((item) => (
                    <div key={item} className="flex gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                        aria-hidden
                      />
                      {item}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isPending}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-70"
                >
                  {isPending ? 'Opening checkout...' : 'Unlock full IQ report - $9.99'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
                {error ? (
                  <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-center text-xs font-semibold leading-5 text-red-700">
                    {error}
                  </p>
                ) : null}
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-medium leading-5 text-slate-500">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  One-time payment. Secure LemonSqueezy checkout.
                </p>
                {onRestart ? (
                  <button
                    type="button"
                    onClick={onRestart}
                    className="mt-3 w-full text-center text-sm font-semibold text-slate-500 transition hover:text-slate-950 hover:underline"
                  >
                    Start again
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
      <IqProductFooter />
    </main>
  );
}

function LockedResultCard({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className="mt-4 space-y-2" aria-hidden>
        <div className="h-5 w-24 rounded-full bg-slate-200" />
        <div className="h-5 w-16 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

