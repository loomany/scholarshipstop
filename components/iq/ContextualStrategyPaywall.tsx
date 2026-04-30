'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  ExternalLink,
  Lock,
  RefreshCw,
  Sparkles,
  Target
} from 'lucide-react';

import {
  formatScholarshipAwardDisplay,
  getScholarshipDeadlineDisplayParts,
  scholarshipPublicPath,
  type Scholarship
} from '@/app/scholarships/scholarshipsData';
import type {
  AssessmentResult,
  StrategyRecommendation
} from '@/lib/iqAssessmentTypes';

type ContextualStrategyPaywallProps = {
  result: AssessmentResult;
  strategy: StrategyRecommendation;
  recommendedGrants: Scholarship[];
  onRestart?: () => void;
  premiumLocked?: boolean;
};

const unlockedMatchPillClass =
  'rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700';
const unlockedAwardPillClass =
  'rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700';
const unlockedDatePillClass =
  'rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200';
const lockedPillClass =
  'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-transparent text-shadow-none ring-1 ring-slate-200 blur-[3px] select-none';

export default function ContextualStrategyPaywall({
  result,
  strategy,
  recommendedGrants,
  onRestart,
  premiumLocked = false
}: ContextualStrategyPaywallProps) {
  const sortedDomains = [...result.domainScores].sort((a, b) => b.score - a.score);
  const topDomain = sortedDomains[0];
  const topThreeDomains = sortedDomains.slice(0, 3);
  const estimatedRange = `${Math.max(70, result.iqScore - 4)}-${Math.min(
    145,
    result.iqScore + 4
  )}`;

  return (
    <main className="bg-[radial-gradient(circle_at_12%_8%,#ffedd5_0,transparent_30%),radial-gradient(circle_at_86%_10%,#dbeafe_0,transparent_28%),#F8FAFC] px-4 py-10 text-slate-950 sm:px-6 sm:py-14">
      <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_90px_-42px_rgba(15,23,42,0.5)]">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-700 ring-1 ring-orange-100">
              <Sparkles className="h-4 w-4" aria-hidden />
              Personalized strategy report
            </div>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Brain Archetype
            </p>
            <h1
              className={
                premiumLocked
                  ? 'mt-2 select-none text-4xl font-semibold tracking-tight text-slate-950 blur-[4px] sm:text-5xl'
                  : 'mt-2 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl'
              }
            >
              {result.archetype}
            </h1>
            <p
              className={
                premiumLocked
                  ? 'mt-4 select-none text-base leading-7 text-slate-600 blur-[3px]'
                  : 'mt-4 text-base leading-7 text-slate-600'
              }
            >
              {strategy.hook_title}. Your assessment and goal profile point to a
              strategy built around your strongest cognitive signals, not generic
              scholarship advice.
            </p>

            <div
              className={
                premiumLocked
                  ? 'mt-7 grid select-none gap-3 blur-[3px] sm:grid-cols-2'
                  : 'mt-7 grid gap-3 sm:grid-cols-2'
              }
            >
              <SnapshotCard label="Estimated IQ range" value={estimatedRange} />
              <SnapshotCard
                label="Top cognitive domain"
                value={topDomain?.label ?? 'Cognitive Reasoning'}
              />
            </div>
            {premiumLocked ? <PremiumReportLockOverlay placement="numbers" /> : null}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-slate-500" aria-hidden />
                <p className="text-sm font-bold text-slate-950">
                  Top strengths
                </p>
              </div>
              <div
                className={
                  premiumLocked
                    ? 'mt-4 select-none space-y-3 blur-[3px]'
                    : 'mt-4 space-y-3'
                }
              >
                {topThreeDomains.map((domain) => (
                  <div key={domain.domain}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                      <span>{domain.label}</span>
                      <span>{domain.score}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                      <div
                        className="h-full rounded-full bg-slate-950"
                        style={{ width: `${domain.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-600" aria-hidden />
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                  Strategy summary
                </p>
              </div>
              <p
                className={
                  premiumLocked
                    ? 'mt-4 select-none text-base leading-7 text-slate-700 blur-[3px]'
                    : 'mt-4 text-base leading-7 text-slate-700'
                }
              >
                {strategy.strategy_summary}
              </p>
            </div>

            {onRestart ? (
              <div
                className={
                  premiumLocked
                    ? 'mt-6 select-none rounded-[1.75rem] border border-orange-100 bg-orange-50/70 p-5 opacity-75 shadow-sm blur-[3px]'
                    : 'mt-6 rounded-[1.75rem] border border-orange-100 bg-orange-50/70 p-5 shadow-sm'
                }
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm ring-1 ring-orange-100">
                    <RefreshCw className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-950">
                      Want to start the test again?
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Retake the IQ assessment and refill the scholarship details
                      that affect your grants. Your account profile will update
                      with the new answers.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={premiumLocked ? undefined : onRestart}
                  disabled={premiumLocked}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Start IQ test again
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : null}

          </div>

          <div className="relative border-t border-slate-200 bg-slate-50 p-6 pt-4 sm:p-8 sm:pt-5 lg:border-l lg:border-t-0 lg:p-10 lg:pt-5">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                  Recommended grants
                </p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {recommendedGrants.length} matches
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {recommendedGrants.map((grant, index) => {
                  const deadlineDisplay =
                    getScholarshipDeadlineDisplayParts(grant).primary;
                  const awardDisplay = formatIqGrantAward(
                    grant.amount ?? grant.awardAmount ?? null
                  );

                  return (
                    <Link
                        key={grant.id}
                        href={
                          premiumLocked
                            ? '/subscription'
                            : scholarshipPublicPath(grant)
                        }
                        target={premiumLocked ? undefined : '_blank'}
                        rel={premiumLocked ? undefined : 'noreferrer'}
                        className="group block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-start gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                                {index + 1}
                              </span>
                              <p className="text-base font-semibold leading-6 text-slate-950 group-hover:underline">
                                {grant.title}
                              </p>
                            </div>
                            <p
                              className={
                                premiumLocked
                                  ? 'mt-3 line-clamp-3 select-none text-sm leading-6 text-slate-500 blur-[3px]'
                                  : 'mt-3 line-clamp-3 text-sm leading-6 text-slate-500'
                              }
                            >
                              {grant.summaryShort ??
                                grant.listRequirementsSummary ??
                                grant.description}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <p className={unlockedMatchPillClass}>
                              {typeof grant.profileMatchPercent === 'number'
                                ? `${grant.profileMatchPercent}% match`
                                : 'Strong match'}
                            </p>
                            <span className={unlockedAwardPillClass}>
                              {awardDisplay}
                            </span>
                            {deadlineDisplay && deadlineDisplay !== '—' ? (
                              <span className={unlockedDatePillClass}>
                                {deadlineDisplay}
                              </span>
                            ) : null}
                          </div>
                        </div>
                    </Link>
                  );
                })}
                {recommendedGrants.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-600">
                    We could not load live grants in this preview. Open the scholarship
                    hub to see your saved recommendation set.
                  </div>
                ) : null}
              </div>

              <Link
                href={
                  premiumLocked
                    ? '/subscription'
                    : '/scholarships/hub/best-recommendation'
                }
                target={premiumLocked ? undefined : '_blank'}
                rel={premiumLocked ? undefined : 'noreferrer'}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                {premiumLocked ? 'Unlock matched grants' : 'View scholarships'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>

              <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-slate-400" aria-hidden />
                  <p className="text-sm font-bold text-slate-950">
                    Recommended reading path
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  {strategy.recommended_reading.map((item) => (
                    <Link
                      key={item.id}
                      href={premiumLocked ? '/subscription' : item.url}
                      target={premiumLocked ? undefined : '_blank'}
                      rel={premiumLocked ? undefined : 'noreferrer'}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-200 hover:bg-white"
                    >
                      <span className={premiumLocked ? 'blur-[3px]' : undefined}>
                        {item.title}
                      </span>
                      <ExternalLink
                        className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-slate-700"
                        aria-hidden
                      />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-slate-400" aria-hidden />
                  <p className="text-sm font-bold text-slate-950">
                    Improve essays
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      title: 'Open essay improvement tools',
                      href: '/essays'
                    },
                    {
                      title: 'Start a scholarship essay draft',
                      href: '/essay'
                    }
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={premiumLocked ? '/subscription' : item.href}
                      target={premiumLocked ? undefined : '_blank'}
                      rel={premiumLocked ? undefined : 'noreferrer'}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-200 hover:bg-white"
                    >
                      <span className={premiumLocked ? 'blur-[3px]' : undefined}>
                        {item.title}
                      </span>
                      <ExternalLink
                        className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-slate-700"
                        aria-hidden
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function formatIqGrantAward(raw: string | null | undefined): string {
  const formatted = formatScholarshipAwardDisplay(raw) || 'Award varies';

  return formatted.replace(/\d[\d,.]*/g, (value) => {
    const digits = value.replace(/[,.]/g, '');
    if (digits.length <= 3 || !/^\d+$/.test(digits)) return value;
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  });
}

function PremiumReportLockOverlay({
  placement = 'right'
}: {
  placement?: 'right' | 'numbers';
}) {
  const wrapperClass =
    placement === 'numbers'
      ? 'pointer-events-none absolute inset-x-6 top-[13.4rem] z-10 sm:inset-x-8 sm:top-[14.2rem] lg:inset-x-10 lg:top-[14.6rem]'
      : 'pointer-events-none absolute inset-x-5 top-28 z-10 sm:inset-x-8 lg:inset-x-10';

  return (
    <div className={wrapperClass}>
      <div className="pointer-events-auto overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white/95 p-5 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.55)] backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <Lock className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              Premium report ready
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              Unlock your matched grants
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your score is analyzed. Upgrade to reveal the grants, award
              amounts, deadlines, and essay moves most likely to turn this
              profile into funded applications.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            Reveal 4 matched grants with money amounts and deadlines
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            Unlock your strategy summary, reading path, and essay next steps
          </div>
        </div>

        <Link
          href="/subscription"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
          Unlock my matched grants
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function SnapshotCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}
