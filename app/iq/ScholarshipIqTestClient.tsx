'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Check,
  FileText,
  Lock,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

import { cn } from '@/utils/cn';

type Phase =
  | 'landing'
  | 'quiz'
  | 'feedback'
  | 'analyzing'
  | 'paywall'
  | 'report';

type Question = {
  id: string;
  kind: 'profile' | 'reasoning';
  prompt: string;
  helper: string;
  options: string[];
  correctOption?: number;
};

const QUESTIONS: Question[] = [
  {
    id: 'education-level',
    kind: 'profile',
    prompt: 'What education level are you applying from?',
    helper: 'Used only to shape the scholarship shortlist, not your score.',
    options: [
      'High school',
      'Undergraduate',
      'Graduate',
      'Doctoral or research'
    ]
  },
  {
    id: 'field',
    kind: 'profile',
    prompt: 'Which funding path is closest to your goal?',
    helper: 'This helps group your final matches into priority buckets.',
    options: [
      'STEM or technology',
      'Business or leadership',
      'Health or life sciences',
      'Arts, humanities, or social impact'
    ]
  },
  {
    id: 'geo',
    kind: 'profile',
    prompt: 'Where do you want your shortlist to focus?',
    helper: 'Geography is used for curation only.',
    options: [
      'United States',
      'Canada',
      'Europe or UK',
      'International / flexible'
    ]
  },
  {
    id: 'gpa',
    kind: 'profile',
    prompt: 'Which GPA band best describes your profile?',
    helper:
      'We use this to avoid over-weighting awards with strict academic cutoffs.',
    options: [
      '3.8+ / top band',
      '3.3-3.79',
      '2.7-3.29',
      'Prefer not to say / not GPA-based'
    ]
  },
  {
    id: 'sequence-1',
    kind: 'reasoning',
    prompt: 'Complete the sequence: 3, 6, 12, 24, ?',
    helper: 'Select the option that follows the strongest pattern.',
    options: ['30', '36', '48', '72'],
    correctOption: 2
  },
  {
    id: 'analogy-1',
    kind: 'reasoning',
    prompt: 'Scholarship is to eligibility as research grant is to ____.',
    helper: 'Choose the relation that preserves the meaning.',
    options: ['proposal fit', 'deadline', 'campus', 'tuition'],
    correctOption: 0
  },
  {
    id: 'matrix-1',
    kind: 'reasoning',
    prompt: 'If A = 1, C = 3, F = 6, J = 10, what comes next?',
    helper: 'Look for the alphabet positions and the gap pattern.',
    options: ['M = 13', 'N = 14', 'O = 15', 'P = 16'],
    correctOption: 2
  },
  {
    id: 'logic-1',
    kind: 'reasoning',
    prompt:
      'All verified grants have official-source links. Some STEM awards are verified. What must be true?',
    helper: 'Use only the information stated in the prompt.',
    options: [
      'All STEM awards have official-source links',
      'Some verified grants are STEM awards',
      'Some STEM awards have official-source links',
      'No unverified awards are STEM awards'
    ],
    correctOption: 2
  },
  {
    id: 'classification-1',
    kind: 'reasoning',
    prompt:
      'Which item does not belong: deadline, eligibility, award amount, essay tone?',
    helper: 'Three are listing facts; one is an application quality factor.',
    options: ['deadline', 'eligibility', 'award amount', 'essay tone'],
    correctOption: 3
  },
  {
    id: 'sequence-2',
    kind: 'reasoning',
    prompt: 'Complete the pattern: 81, 27, 9, 3, ?',
    helper: 'A consistent operation is applied at each step.',
    options: ['0', '1', '2', '6'],
    correctOption: 1
  },
  {
    id: 'spatial-1',
    kind: 'reasoning',
    prompt:
      'A rule moves from broad category to specific fit. Which order is most precise?',
    helper: 'Think about narrowing a scholarship search.',
    options: [
      'STEM -> engineering -> women in aerospace',
      'engineering -> STEM -> women in aerospace',
      'women in aerospace -> STEM -> engineering',
      'STEM -> women in aerospace -> engineering'
    ],
    correctOption: 0
  },
  {
    id: 'deduction-1',
    kind: 'reasoning',
    prompt:
      'A fund accepts only undergraduates. Maya is a graduate student. What is the best conclusion?',
    helper: 'Avoid assumptions beyond the eligibility rule.',
    options: [
      'Maya should still apply',
      'Maya is likely ineligible for this fund',
      'The fund has no degree requirement',
      'Maya needs a higher GPA'
    ],
    correctOption: 1
  },
  {
    id: 'sequence-3',
    kind: 'reasoning',
    prompt: 'Complete the sequence: 2, 5, 11, 23, ?',
    helper: 'Each term grows by a repeated transformation.',
    options: ['35', '42', '47', '50'],
    correctOption: 2
  },
  {
    id: 'comparison-1',
    kind: 'reasoning',
    prompt:
      'Two awards have the same deadline. Award A matches field and GPA. Award B matches only location. Which should be prioritized?',
    helper: 'Prioritization should maximize fit signals.',
    options: ['Award A', 'Award B', 'Neither', 'The one with the longer name'],
    correctOption: 0
  },
  {
    id: 'analogy-2',
    kind: 'reasoning',
    prompt: 'Filter is to shortlist as rubric is to ____.',
    helper: 'Choose the output created by applying the tool.',
    options: ['calendar', 'ranking', 'email', 'campus'],
    correctOption: 1
  },
  {
    id: 'logic-2',
    kind: 'reasoning',
    prompt:
      'If every premium shortlist includes verified links, and this report includes a premium shortlist, what follows?',
    helper: 'Use a direct conditional inference.',
    options: [
      'The report includes verified links',
      'Every verified link is premium',
      'No free shortlist has links',
      'The report guarantees funding'
    ],
    correctOption: 0
  },
  {
    id: 'classification-2',
    kind: 'reasoning',
    prompt: 'Which signal is least useful for estimating scholarship fit?',
    helper: 'Fit is based on eligibility and application relevance.',
    options: [
      'degree level',
      'field of study',
      'provider logo color',
      'residency requirement'
    ],
    correctOption: 2
  },
  {
    id: 'synthesis-1',
    kind: 'reasoning',
    prompt:
      'A student has strong leadership, mid GPA, and limited time. Which bucket should come first?',
    helper: 'Pick the strategy with the best signal-to-effort balance.',
    options: [
      'Leadership awards with flexible GPA rules',
      'All awards over $25,000',
      'Only essay-heavy national contests',
      'Awards outside their education level'
    ],
    correctOption: 0
  }
];

const REPORT_GRANTS = [
  {
    name: 'Generation Google Scholarship',
    amount: '$10,000',
    bucket: 'High fit',
    reason:
      'Strong STEM and leadership alignment with clear eligibility signals.'
  },
  {
    name: 'Coca-Cola Leaders of Promise Scholarship',
    amount: '$1,000+',
    bucket: 'High fit',
    reason:
      'Good match for students with leadership evidence and repeatable application assets.'
  },
  {
    name: 'Boeing Aerospace Scholarship',
    amount: 'Varies',
    bucket: 'Field priority',
    reason:
      'Technical pathway award for aerospace, engineering, and related STEM profiles.'
  },
  {
    name: 'Wells Fargo Veterans Scholarship Program',
    amount: 'Varies',
    bucket: 'Conditional',
    reason:
      'Strong verified-program candidate when veteran or family eligibility applies.'
  },
  {
    name: 'FedEx HBCU Scholarship',
    amount: 'Varies',
    bucket: 'Profile-based',
    reason:
      'Useful for HBCU-aligned profiles with business, logistics, or leadership interests.'
  },
  {
    name: 'AbbVie Immunology Scholarship',
    amount: 'Varies',
    bucket: 'Specialized fit',
    reason:
      'Best for students with qualifying health context and a strong personal statement.'
  },
  {
    name: 'Microsoft-related STEM Programs',
    amount: 'Varies',
    bucket: 'Explore',
    reason:
      'Relevant for computing, data, AI, and diversity-in-tech scholarship searches.'
  }
];

const analyzerMessages = [
  'Calculating score band...',
  'Mapping reasoning profile...',
  'Preparing scholarship fit engine...'
];

const stageLabels = ['Profile', 'Reasoning Analysis', 'Report'];

function percentileForScore(score: number) {
  if (score >= 132) return 98;
  if (score >= 125) return 95;
  if (score >= 120) return 91;
  if (score >= 115) return 84;
  if (score >= 110) return 75;
  if (score >= 105) return 63;
  return 52;
}

export default function ScholarshipIqTestClient() {
  const [phase, setPhase] = useState<Phase>('landing');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [analyzerMessageIndex, setAnalyzerMessageIndex] = useState(0);

  const currentQuestion = QUESTIONS[currentIndex];
  const selectedAnswer =
    currentQuestion && answers[currentQuestion.id] !== undefined
      ? answers[currentQuestion.id]
      : undefined;

  const report = useMemo(() => {
    const correct = QUESTIONS.reduce((total, question) => {
      if (question.correctOption === undefined) return total;
      return total + (answers[question.id] === question.correctOption ? 1 : 0);
    }, 0);
    const score = Math.max(102, Math.min(138, 94 + correct * 3));

    return {
      correct,
      score,
      percentile: percentileForScore(score),
      band:
        score >= 125
          ? 'Advanced funding strategist'
          : score >= 115
            ? 'Strong pattern-led applicant'
            : 'Practical match builder'
    };
  }, [answers]);

  useEffect(() => {
    if (phase !== 'analyzing') return;

    setAnalyzerMessageIndex(0);
    const interval = window.setInterval(() => {
      setAnalyzerMessageIndex((index) =>
        Math.min(index + 1, analyzerMessages.length - 1)
      );
    }, 900);
    const done = window.setTimeout(() => {
      setPhase('paywall');
    }, 3200);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(done);
    };
  }, [phase]);

  const startQuiz = () => {
    setCurrentIndex(0);
    setAnswers({});
    setPhase('quiz');
  };

  const answerCurrentQuestion = (optionIndex: number) => {
    if (!currentQuestion) return;
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: optionIndex
    }));
  };

  const continueQuiz = () => {
    if (!currentQuestion || selectedAnswer === undefined) return;

    if (currentIndex === QUESTIONS.length - 1) {
      setPhase('analyzing');
      return;
    }

    if (currentIndex === 5) {
      setPhase('feedback');
      return;
    }

    setCurrentIndex((index) => index + 1);
  };

  const continueAfterFeedback = () => {
    setCurrentIndex((index) => index + 1);
    setPhase('quiz');
  };

  const activeStage =
    phase === 'landing'
      ? 0
      : phase === 'quiz' && currentQuestion?.kind === 'profile'
        ? 0
        : phase === 'quiz' || phase === 'feedback' || phase === 'analyzing'
          ? 1
          : 2;

  return (
    <div className="min-h-screen bg-white text-slate-950">
      {phase === 'landing' ? (
        <LandingScreen onStart={startQuiz} />
      ) : (
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <ProgressHeader
            activeStage={activeStage}
            currentIndex={Math.min(currentIndex + 1, QUESTIONS.length)}
            total={QUESTIONS.length}
            phase={phase}
          />

          <div className="flex flex-1 items-center justify-center py-8 sm:py-12">
            {phase === 'quiz' && currentQuestion ? (
              <QuestionScreen
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                selectedAnswer={selectedAnswer}
                onSelect={answerCurrentQuestion}
                onContinue={continueQuiz}
              />
            ) : null}

            {phase === 'feedback' ? (
              <FeedbackScreen onContinue={continueAfterFeedback} />
            ) : null}

            {phase === 'analyzing' ? (
              <AnalyzerScreen
                message={analyzerMessages[analyzerMessageIndex]}
              />
            ) : null}

            {phase === 'paywall' ? (
              <PaywallScreen onUnlock={() => setPhase('report')} />
            ) : null}

            {phase === 'report' ? <ReportScreen report={report} /> : null}
          </div>
        </div>
      )}
    </div>
  );
}

function LandingScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_68%,#ffffff_100%)]">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
            Scholarship Intelligence Diagnostic
          </div>
          <h1
            data-heading-mobile-align="start"
            className="mt-6 text-balance text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl"
          >
            Discover your Scholarship IQ and unlock funding paths that fit your
            profile.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-8 text-slate-600 lg:mx-0">
            Quick interactive assessment. Works perfectly on mobile. Start free.
            Full report is optional paid unlock.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 sm:w-auto"
            >
              Start free diagnostic
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <span className="text-sm text-slate-500">
              No account required for the preview.
            </span>
          </div>

          <div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
            {[
              'Transparent assessment + curation',
              'No scholarship guarantee claims',
              'One-time premium unlock'
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm font-medium text-slate-700 shadow-sm"
              >
                <Check className="mb-3 h-4 w-4 text-emerald-600" aria-hidden />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/70">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Diagnostic preview
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Reasoning profile + scholarship fit
                  </p>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  Free start
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  ['Profile signals', 'Education, field, geography, GPA'],
                  [
                    'Reasoning analysis',
                    'Pattern recognition and prioritization'
                  ],
                  ['Curated report', 'Score band, percentile, shortlist']
                ].map(([title, text], index) => (
                  <div
                    key={title}
                    className="flex items-start gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{title}</p>
                      <p className="mt-1 text-sm text-slate-500">{text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Premium unlock at the end
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  One-time report access. Payment is for analysis and curation,
                  not for a scholarship award.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProgressHeader({
  activeStage,
  currentIndex,
  total,
  phase
}: {
  activeStage: number;
  currentIndex: number;
  total: number;
  phase: Phase;
}) {
  const microProgress =
    phase === 'report' || phase === 'paywall'
      ? 100
      : Math.round((currentIndex / total) * 100);

  return (
    <header className="sticky top-16 z-20 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 md:top-20 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-3 sm:grid-cols-3">
          {stageLabels.map((stage, index) => (
            <div
              key={stage}
              className={cn(
                'rounded-full border px-4 py-2 text-center text-xs font-semibold transition',
                index <= activeStage
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-slate-200 bg-white text-slate-500'
              )}
            >
              {stage}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${microProgress}%` }}
            />
          </div>
          <div className="min-w-16 text-right text-sm font-semibold tabular-nums text-slate-600">
            {phase === 'paywall' || phase === 'report'
              ? '18 / 18'
              : `${currentIndex} / ${total}`}
          </div>
        </div>
      </div>
    </header>
  );
}

function QuestionScreen({
  question,
  questionNumber,
  selectedAnswer,
  onSelect,
  onContinue
}: {
  question: Question;
  questionNumber: number;
  selectedAnswer?: number;
  onSelect: (optionIndex: number) => void;
  onContinue: () => void;
}) {
  return (
    <section className="w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
          Step {questionNumber}
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
          {question.kind === 'profile' ? 'Profile signal' : 'Scored reasoning'}
        </div>
      </div>

      <h2
        data-heading-mobile-align="start"
        className="mt-7 text-pretty text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
      >
        {question.prompt}
      </h2>
      <p className="mt-3 text-base leading-7 text-slate-600">
        {question.helper}
      </p>

      <div className="mt-8 grid gap-3">
        {question.options.map((option, index) => {
          const selected = selectedAnswer === index;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                'flex w-full items-center justify-between rounded-2xl border p-4 text-left text-base font-medium transition',
                selected
                  ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/10'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <span>{option}</span>
              <span
                className={cn(
                  'ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs',
                  selected
                    ? 'border-white/40 bg-white text-slate-950'
                    : 'border-slate-300 text-slate-400'
                )}
              >
                {selected ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  index + 1
                )}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={selectedAnswer === undefined}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/15 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none sm:w-auto"
      >
        Continue
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </section>
  );
}

function FeedbackScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <Sparkles className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">
        Pattern analysis calibrated
      </h2>
      <p className="mx-auto mt-3 max-w-md text-base leading-7 text-slate-600">
        Your early responses have set the baseline. Continue with the remaining
        reasoning steps to prepare the diagnostic report.
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
      >
        Continue analysis
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </section>
  );
}

function AnalyzerScreen({ message }: { message: string }) {
  return (
    <section className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-slate-50 ring-1 ring-slate-200">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
      </div>
      <h2 className="mt-7 text-3xl font-semibold tracking-tight text-slate-950">
        Preparing your diagnostic
      </h2>
      <p className="mt-3 text-base font-medium text-emerald-700">{message}</p>
      <div className="mx-auto mt-7 h-2 max-w-sm overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-emerald-500" />
      </div>
    </section>
  );
}

function PaywallScreen({ onUnlock }: { onUnlock: () => void }) {
  return (
    <section className="grid w-full max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white">
          <Lock className="h-5 w-5" aria-hidden />
        </div>
        <h2
          data-heading-mobile-align="start"
          className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
        >
          Unlock my Scholarship IQ Report - $9.90 one-time
        </h2>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Your free diagnostic is complete. The one-time unlock covers the
          reasoning report and curated scholarship shortlist. It does not sell
          or guarantee scholarship funding.
        </p>
        <button
          type="button"
          onClick={onUnlock}
          data-checkout-provider="stripe-freebee-placeholder"
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/15 transition hover:bg-emerald-700"
        >
          Continue to secure unlock
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">
          MVP checkout placeholder. Click simulates successful payment.
        </p>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-7 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Included in report
        </p>
        <div className="mt-6 grid gap-4">
          {[
            [
              'Personal reasoning score',
              'A clean score band based on 14 reasoning items.'
            ],
            [
              'Percentile estimate',
              'A simple comparative percentile for positioning your profile.'
            ],
            [
              'Scholarship shortlist',
              '15-30 curated matches grouped by practical priority.'
            ],
            [
              'Priority buckets',
              'High fit, field priority, conditional, and explore lanes.'
            ]
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex gap-3">
                <Check
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                  aria-hidden
                />
                <div>
                  <p className="font-semibold text-slate-950">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {text}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReportScreen({
  report
}: {
  report: { correct: number; score: number; percentile: number; band: string };
}) {
  return (
    <section className="w-full max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Scholarship IQ
              </p>
              <p className="text-sm text-slate-500">Diagnostic report</p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-7xl font-semibold tracking-[-0.08em] text-slate-950">
              {report.score}
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-900">
              {report.band}
            </p>
            <p className="mt-2 text-base leading-7 text-slate-600">
              Estimated {report.percentile}th percentile based on pattern
              recognition, logical narrowing, and scholarship-fit
              prioritization.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <MetricCard label="Reasoning hits" value={`${report.correct}/14`} />
            <MetricCard label="Priority matches" value="23" />
          </div>

          <Link
            href="https://scholarshiptop.com/start"
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            See my verified matches in workspace
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                data-heading-mobile-align="start"
                className="text-2xl font-semibold tracking-tight text-slate-950"
              >
                Top curated grant matches
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                MVP preview list from the ScholarshipTop catalog. Full workspace
                matching can expand this to 15-30 verified opportunities.
              </p>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              7 shown
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {REPORT_GRANTS.map((grant) => (
              <article
                key={grant.name}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText
                        className="h-4 w-4 shrink-0 text-slate-400"
                        aria-hidden
                      />
                      <h3 className="truncate text-base font-semibold text-slate-950">
                        {grant.name}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {grant.reason}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-950">
                      {grant.amount}
                    </p>
                    <p className="mt-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      {grant.bucket}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}
