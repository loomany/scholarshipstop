'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BrainCircuit, Clock3, Timer } from 'lucide-react';

import {
  cognitiveAssessmentQuestions,
  type CognitiveAssessmentQuestion,
  type CognitiveOptionKey,
  type CognitiveQuestionDomain,
  type CognitiveVisualKind
} from '@/lib/cognitiveAssessmentQuestions';
import { cn } from '@/utils/cn';

type AssessmentPhase = 'intro' | 'assessment' | 'analyzing' | 'paywall';
type ProgressPhase = 'Calibration' | 'Fluid Reasoning' | 'IQ Report';
type AnswerMap = Record<string, CognitiveOptionKey>;
type DomainScore = {
  domain: CognitiveQuestionDomain;
  label: string;
  score: number;
};

const TOTAL_QUESTIONS = cognitiveAssessmentQuestions.length;
const MAX_WEIGHTED_SCORE = cognitiveAssessmentQuestions.reduce(
  (total, question) => total + question.weight,
  0
);
const optionKeys: CognitiveOptionKey[] = ['A', 'B', 'C', 'D'];
const ASSESSMENT_DRAFT_STORAGE_KEY = 'cognitive_assessment_draft:v1';

const analyzerMessages = [
  'Scoring weighted IQ items...',
  'Calculating IQ percentile...',
  'Mapping Brain Archetype...'
];

type AssessmentDraft = {
  phase: Exclude<AssessmentPhase, 'analyzing'>;
  currentIndex: number;
  answers: AnswerMap;
  questionStartedAt: number | null;
  updatedAt: string;
};

function isOptionKey(value: unknown): value is CognitiveOptionKey {
  return typeof value === 'string' && optionKeys.includes(value as CognitiveOptionKey);
}

function readAssessmentDraft(): AssessmentDraft | null {
  try {
    const raw = window.localStorage.getItem(ASSESSMENT_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AssessmentDraft> & {
      phase?: unknown;
      currentIndex?: unknown;
      answers?: unknown;
      updatedAt?: unknown;
    };
    let phase: AssessmentDraft['phase'] | null = null;
    if (
      parsed.phase === 'intro' ||
      parsed.phase === 'assessment' ||
      parsed.phase === 'paywall'
    ) {
      phase = parsed.phase;
    }
    if (!phase) return null;

    const validQuestionIds = new Set(cognitiveAssessmentQuestions.map((q) => q.id));
    const answers: AnswerMap = {};
    if (parsed.answers && typeof parsed.answers === 'object') {
      for (const [questionId, value] of Object.entries(parsed.answers)) {
        if (validQuestionIds.has(questionId) && isOptionKey(value)) {
          answers[questionId] = value;
        }
      }
    }

    let currentIndex =
      typeof parsed.currentIndex === 'number' && Number.isFinite(parsed.currentIndex)
        ? Math.max(0, Math.min(TOTAL_QUESTIONS - 1, Math.floor(parsed.currentIndex)))
        : Math.min(Object.keys(answers).length, TOTAL_QUESTIONS - 1);

    if (phase === 'assessment') {
      while (
        currentIndex < TOTAL_QUESTIONS - 1 &&
        answers[cognitiveAssessmentQuestions[currentIndex]?.id ?? '']
      ) {
        currentIndex += 1;
      }
      if (
        currentIndex >= TOTAL_QUESTIONS - 1 &&
        answers[cognitiveAssessmentQuestions[currentIndex]?.id ?? '']
      ) {
        phase = 'paywall';
      }
    }

    return {
      phase,
      currentIndex,
      answers,
      questionStartedAt:
        typeof parsed.questionStartedAt === 'number' &&
        Number.isFinite(parsed.questionStartedAt)
          ? parsed.questionStartedAt
          : phase === 'assessment'
            ? Date.now()
            : null,
      updatedAt:
        typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString()
    };
  } catch {
    return null;
  }
}

function writeAssessmentDraft(draft: AssessmentDraft) {
  try {
    window.localStorage.setItem(
      ASSESSMENT_DRAFT_STORAGE_KEY,
      JSON.stringify(draft)
    );
  } catch {
    // Ignore storage failures; the assessment should remain usable.
  }
}

const domainLabels: Record<CognitiveQuestionDomain, string> = {
  pattern_abstract: 'Abstract Reasoning',
  numeric_reasoning: 'Numerical Logic',
  verbal_logic: 'Verbal Reasoning',
  spatial_visual: 'Spatial Intelligence',
  prioritization_decision: 'Decision Speed'
};

const domainOrder: CognitiveQuestionDomain[] = [
  'pattern_abstract',
  'numeric_reasoning',
  'spatial_visual',
  'verbal_logic',
  'prioritization_decision'
];

function progressPhaseForStep(step: number): ProgressPhase {
  if (step <= 10) return 'Calibration';
  if (step <= 24) return 'Fluid Reasoning';
  return 'IQ Report';
}

function scoreQuestionBank(
  questions: CognitiveAssessmentQuestion[],
  answers: AnswerMap
) {
  return questions.reduce((score, question) => {
    return (
      score +
      (answers[question.id] === question.correct_option ? question.weight : 0)
    );
  }, 0);
}

function iqScoreFromWeightedScore(weightedScore: number) {
  const ratio = weightedScore / MAX_WEIGHTED_SCORE;
  return Math.round(Math.max(70, Math.min(145, 70 + ratio * 75)));
}

function percentileFromIq(iqScore: number) {
  if (iqScore >= 140) return 99;
  if (iqScore >= 130) return 98;
  if (iqScore >= 120) return 91;
  if (iqScore >= 115) return 84;
  if (iqScore >= 110) return 75;
  if (iqScore >= 105) return 63;
  if (iqScore >= 100) return 50;
  if (iqScore >= 95) return 37;
  if (iqScore >= 90) return 25;
  if (iqScore >= 85) return 16;
  if (iqScore >= 80) return 9;
  return 3;
}

function calculateDomainScores(
  questions: CognitiveAssessmentQuestion[],
  answers: AnswerMap
): DomainScore[] {
  return domainOrder.map((domain) => {
    const domainQuestions = questions.filter(
      (question) => question.domain === domain
    );
    const max = domainQuestions.reduce(
      (total, question) => total + question.weight,
      0
    );
    const earned = scoreQuestionBank(domainQuestions, answers);
    return {
      domain,
      label: domainLabels[domain],
      score: max > 0 ? Math.round((earned / max) * 100) : 0
    };
  });
}

function lockedArchetype(scores: DomainScore[]) {
  const byDomain = Object.fromEntries(
    scores.map((item) => [item.domain, item.score])
  ) as Record<CognitiveQuestionDomain, number>;
  const logicProxy = (byDomain.pattern_abstract + byDomain.verbal_logic) / 2;
  const architect =
    byDomain.spatial_visual * 0.55 + byDomain.pattern_abstract * 0.45;
  const analyst = byDomain.numeric_reasoning * 0.6 + logicProxy * 0.4;
  const strategist =
    byDomain.prioritization_decision * 0.55 + byDomain.verbal_logic * 0.45;

  const sorted = [
    { label: 'Spatial Architect', value: architect },
    { label: 'Quantitative Analyst', value: analyst },
    { label: 'Strategic Reasoner', value: strategist }
  ].sort((a, b) => b.value - a.value);

  if (sorted[0]!.value - sorted[1]!.value < 7) {
    return `${sorted[0]!.label} / ${sorted[1]!.label}`;
  }

  return sorted[0]!.label;
}

export default function CognitiveAssessmentEngineClient() {
  const [phase, setPhase] = useState<AssessmentPhase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [selectedOption, setSelectedOption] =
    useState<CognitiveOptionKey | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(
    cognitiveAssessmentQuestions[0]?.time_limit_sec ?? 0
  );
  const advancingRef = useRef(false);

  const currentQuestion =
    cognitiveAssessmentQuestions[currentIndex] ?? cognitiveAssessmentQuestions[0];
  const step = currentIndex + 1;
  const progress = Math.round((step / TOTAL_QUESTIONS) * 100);
  const weightedScore = useMemo(
    () => scoreQuestionBank(cognitiveAssessmentQuestions, answers),
    [answers]
  );
  const iqScore = iqScoreFromWeightedScore(weightedScore);
  const percentile = percentileFromIq(iqScore);
  const domains = useMemo(
    () => calculateDomainScores(cognitiveAssessmentQuestions, answers),
    [answers]
  );
  const archetype = lockedArchetype(domains);
  const progressPhase =
    phase === 'assessment' ? progressPhaseForStep(step) : 'IQ Report';

  useEffect(() => {
    const draft = readAssessmentDraft();
    if (draft) {
      setPhase(draft.phase);
      setCurrentIndex(draft.currentIndex);
      setAnswers(draft.answers);
      setQuestionStartedAt(draft.questionStartedAt);
      setSelectedOption(null);
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    writeAssessmentDraft({
      phase: phase === 'analyzing' ? 'paywall' : phase,
      currentIndex,
      answers,
      questionStartedAt,
      updatedAt: new Date().toISOString()
    });
  }, [answers, currentIndex, draftHydrated, phase, questionStartedAt]);

  useEffect(() => {
    if (phase !== 'analyzing') return;

    setMessageIndex(0);
    const interval = window.setInterval(() => {
      setMessageIndex((index) =>
        Math.min(index + 1, analyzerMessages.length - 1)
      );
    }, 900);
    const done = window.setTimeout(() => {
      setPhase('paywall');
    }, 3000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(done);
    };
  }, [phase]);

  useEffect(() => {
    if (!draftHydrated || phase !== 'assessment') return;
    if (questionStartedAt != null) return;
    setQuestionStartedAt(Date.now());
  }, [draftHydrated, phase, questionStartedAt]);

  const finishCurrentQuestion = useCallback(
    (delayMs = 0) => {
      if (advancingRef.current) return;
      advancingRef.current = true;

      window.setTimeout(() => {
        if (currentIndex >= TOTAL_QUESTIONS - 1) {
          setQuestionStartedAt(null);
          setPhase('analyzing');
          advancingRef.current = false;
          return;
        }

        const nextIndex = currentIndex + 1;
        const startedAt = Date.now();
        setCurrentIndex(nextIndex);
        setQuestionStartedAt(startedAt);
        setTimeLeft(
          cognitiveAssessmentQuestions[nextIndex]?.time_limit_sec ?? 0
        );
        setSelectedOption(null);
        advancingRef.current = false;
      }, delayMs);
    },
    [currentIndex]
  );

  useEffect(() => {
    if (
      !draftHydrated ||
      phase !== 'assessment' ||
      selectedOption !== null ||
      questionStartedAt == null
    ) {
      return;
    }

    const updateRemaining = () => {
      const elapsedSeconds = Math.floor((Date.now() - questionStartedAt) / 1000);
      const remaining = Math.max(
        0,
        currentQuestion.time_limit_sec - elapsedSeconds
      );
      setTimeLeft(remaining);

      if (remaining <= 0) {
        finishCurrentQuestion(0);
      }
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 250);
    return () => window.clearInterval(interval);
  }, [
    currentQuestion.time_limit_sec,
    draftHydrated,
    finishCurrentQuestion,
    phase,
    questionStartedAt,
    selectedOption
  ]);

  const answerQuestion = (optionKey: CognitiveOptionKey) => {
    if (selectedOption !== null || phase !== 'assessment' || advancingRef.current) {
      return;
    }

    setSelectedOption(optionKey);
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: optionKey
    }));

    finishCurrentQuestion(220);
  };

  const startAssessment = () => {
    const startedAt = Date.now();
    advancingRef.current = false;
    setAnswers({});
    setCurrentIndex(0);
    setSelectedOption(null);
    setQuestionStartedAt(startedAt);
    setTimeLeft(cognitiveAssessmentQuestions[0]?.time_limit_sec ?? 0);
    setPhase('assessment');
  };

  return (
    <main className="fixed inset-0 z-[200] overflow-y-auto bg-[#F8FAFC] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <ProgressHeader
          phase={progressPhase}
          progress={
            !draftHydrated
              ? 0
              : phase === 'paywall'
                ? 100
                : phase === 'intro'
                  ? 0
                  : progress
          }
          step={phase === 'intro' ? 0 : Math.min(step, TOTAL_QUESTIONS)}
        />

        <div
          className={cn(
            'flex flex-1 justify-center',
            phase === 'intro'
              ? 'items-start pt-6 pb-8 sm:pt-8 sm:pb-12'
              : phase === 'assessment'
                ? 'items-start pt-8 pb-8 sm:pt-10 sm:pb-12'
              : 'items-center py-8 sm:py-12'
          )}
        >
          {draftHydrated && phase === 'intro' ? (
            <IntroScreen onStart={startAssessment} />
          ) : null}

          {draftHydrated && phase === 'assessment' && currentQuestion ? (
            <QuestionScreen
              question={currentQuestion}
              step={step}
              timeLeft={timeLeft}
              selectedOption={selectedOption}
              onAnswer={answerQuestion}
            />
          ) : null}

          {draftHydrated && phase === 'analyzing' ? (
            <AnalyzerScreen message={analyzerMessages[messageIndex]} />
          ) : null}

          {draftHydrated && phase === 'paywall' ? (
            <PaywallScreen
              lockedIq={iqScore}
              percentile={percentile}
              lockedArchetype={archetype}
              domainScores={domains}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function ProgressHeader({
  phase,
  progress,
  step
}: {
  phase: ProgressPhase;
  progress: number;
  step: number;
}) {
  return (
    <header className="mx-auto w-full border-b border-slate-200 pb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            SaaS IQ Test
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
            {phase}
          </p>
        </div>
        <p className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold tabular-nums text-slate-600">
          Step {step} of {TOTAL_QUESTIONS}
        </p>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-slate-950 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="min-w-12 text-right text-sm font-semibold tabular-nums text-slate-500">
          {progress}%
        </span>
      </div>
    </header>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  const summaryCards = [
    {
      title: '30 items',
      description:
        'Carefully calibrated questions designed to assess your true cognitive baseline.'
    },
    {
      title: '5 domains',
      description:
        'A comprehensive analysis of logic, spatial reasoning, and processing speed.'
    },
    {
      title: 'IQ score',
      description:
        'Get a detailed performance breakdown and discover your unique Brain Archetype.'
    }
  ];

  return (
    <section className="w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.42)] sm:p-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
        <BrainCircuit className="h-4 w-4" aria-hidden />
        30-question IQ test
      </div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
        Measure your IQ score and cognitive pattern.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
        Complete a timed, multi-domain IQ test covering abstract reasoning,
        numerical logic, spatial intelligence, verbal reasoning, and decision
        speed.
      </p>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {summaryCards.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-sm font-bold text-slate-950">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {item.description}
            </p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onStart}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
      >
        Start IQ Test
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </section>
  );
}

function QuestionScreen({
  question,
  step,
  timeLeft,
  selectedOption,
  onAnswer
}: {
  question: CognitiveAssessmentQuestion;
  step: number;
  timeLeft: number;
  selectedOption: CognitiveOptionKey | null;
  onAnswer: (optionKey: CognitiveOptionKey) => void;
}) {
  return (
    <section className="w-full">
      <div className="mb-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">
            {domainLabels[question.domain]}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {question.difficulty}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]',
              timeLeft <= 10
                ? 'border-red-200 text-red-600'
                : 'border-slate-200 text-slate-500'
            )}
          >
            <Timer className="h-3.5 w-3.5" aria-hidden />
            {timeLeft}s
          </span>
        </div>
        <h1 className="mx-auto mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          {question.prompt}
        </h1>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.35)] sm:p-6">
        {question.visual ? <CognitiveVisualCard question={question} /> : null}

        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700">
            Choose one answer
          </p>
          <p className="text-xs font-medium text-slate-400">Question {step}</p>
        </div>

        <div className="grid gap-3">
          {optionKeys.map((optionKey) => {
            const selected = selectedOption === optionKey;
            return (
              <button
                key={`${question.id}-${optionKey}`}
                type="button"
                onClick={() => onAnswer(optionKey)}
                disabled={selectedOption !== null}
                className={cn(
                  'flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-default',
                  selected
                    ? 'border-slate-950 ring-2 ring-slate-950/10'
                    : 'border-slate-200'
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                    selected
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  )}
                >
                  {optionKey}
                </span>
                <span className="min-w-0 flex-1 text-base font-medium leading-6 text-slate-800">
                  {question.options[optionKey]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CognitiveVisualCard({
  question
}: {
  question: CognitiveAssessmentQuestion;
}) {
  if (!question.visual) return null;

  return (
    <div className="mb-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-bold text-slate-950">
            {question.visual.title}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {question.visual.caption}
          </p>
        </div>
        <Clock3 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </div>
      <div className="grid min-h-56 place-items-center p-5">
        <VisualSketch kind={question.visual.kind} id={question.id} />
      </div>
    </div>
  );
}

function VisualSketch({ kind, id }: { kind: CognitiveVisualKind; id: string }) {
  if (kind === 'matrix') return <MatrixSketch id={id} />;
  if (kind === 'rotation') return <RotationSketch />;
  if (kind === 'mirror') return <MirrorSketch />;
  if (kind === 'blocks') return <BlocksSketch />;
  return <CubeSketch />;
}

function MatrixSketch({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 360 220" className="h-56 w-full max-w-xl" role="img">
      <rect width="360" height="220" rx="24" fill="#F8FAFC" />
      {Array.from({ length: 9 }).map((_, index) => {
        const x = 58 + (index % 3) * 82;
        const y = 34 + Math.floor(index / 3) * 56;
        const missing = index === 8;
        return (
          <g key={`${id}-${index}`}>
            <rect
              x={x}
              y={y}
              width="48"
              height="38"
              rx="10"
              fill={missing ? '#FFFFFF' : '#E0F2FE'}
              stroke={missing ? '#0F172A' : '#CBD5E1'}
              strokeDasharray={missing ? '5 5' : undefined}
              strokeWidth="2"
            />
            {missing ? (
              <text
                x={x + 24}
                y={y + 25}
                textAnchor="middle"
                fontSize="20"
                fill="#0F172A"
              >
                ?
              </text>
            ) : (
              <path
                d={`M ${x + 16} ${y + 25} L ${x + 32} ${y + 12} L ${x + 32} ${y + 31} Z`}
                fill={index % 2 === 0 ? '#0F172A' : 'none'}
                stroke="#0F172A"
                strokeWidth="2"
                transform={`rotate(${index * 45} ${x + 24} ${y + 20})`}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function RotationSketch() {
  return (
    <svg viewBox="0 0 360 220" className="h-56 w-full max-w-xl" role="img">
      <rect width="360" height="220" rx="24" fill="#F8FAFC" />
      <path
        d="M105 70 h64 v32 h-32 v48 h-32z"
        fill="#DBEAFE"
        stroke="#0F172A"
        strokeWidth="3"
      />
      <circle cx="153" cy="86" r="7" fill="#2563EB" />
      <path
        d="M210 110 h46"
        stroke="#94A3B8"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M244 98 l14 12 -14 12"
        fill="none"
        stroke="#94A3B8"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M252 62 v64 h-32 v-32 h-48 v-32z"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="3"
      />
      <circle cx="236" cy="110" r="7" fill="#2563EB" />
    </svg>
  );
}

function MirrorSketch() {
  return (
    <svg viewBox="0 0 360 220" className="h-56 w-full max-w-xl" role="img">
      <rect width="360" height="220" rx="24" fill="#F8FAFC" />
      <line
        x1="180"
        y1="36"
        x2="180"
        y2="184"
        stroke="#94A3B8"
        strokeWidth="3"
        strokeDasharray="7 7"
      />
      <path
        d="M88 70 h52 l28 40 -28 40 h-52 l22 -40z"
        fill="#DBEAFE"
        stroke="#0F172A"
        strokeWidth="3"
      />
      <path
        d="M272 70 h-52 l-28 40 28 40 h52 l-22 -40z"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="3"
      />
      <circle cx="120" cy="110" r="7" fill="#2563EB" />
      <circle cx="240" cy="110" r="7" fill="#2563EB" />
    </svg>
  );
}

function BlocksSketch() {
  return (
    <svg viewBox="0 0 360 220" className="h-56 w-full max-w-xl" role="img">
      <rect width="360" height="220" rx="24" fill="#F8FAFC" />
      {[0, 1, 2, 3].map((index) => {
        const x = 110 + (index % 2) * 42;
        const y = 110 - Math.floor(index / 2) * 32;
        return (
          <g key={index}>
            <rect
              x={x}
              y={y}
              width="38"
              height="38"
              fill="#DBEAFE"
              stroke="#0F172A"
              strokeWidth="2"
            />
            <path
              d={`M${x} ${y} l16 -14 h38 l-16 14z`}
              fill="#BFDBFE"
              stroke="#0F172A"
              strokeWidth="2"
            />
            <path
              d={`M${x + 38} ${y} l16 -14 v38 l-16 14z`}
              fill="#93C5FD"
              stroke="#0F172A"
              strokeWidth="2"
            />
          </g>
        );
      })}
      <g transform="translate(230 72)">
        <rect
          x="0"
          y="42"
          width="32"
          height="32"
          fill="#FFFFFF"
          stroke="#0F172A"
          strokeWidth="2"
        />
        <rect
          x="32"
          y="42"
          width="32"
          height="32"
          fill="#FFFFFF"
          stroke="#0F172A"
          strokeWidth="2"
        />
        <rect
          x="0"
          y="10"
          width="32"
          height="32"
          fill="#FFFFFF"
          stroke="#0F172A"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}

function CubeSketch() {
  return (
    <svg viewBox="0 0 360 220" className="h-56 w-full max-w-xl" role="img">
      <rect width="360" height="220" rx="24" fill="#F8FAFC" />
      <path
        d="M90 80 h62 l36 34 v62 h-62 l-36 -34z"
        fill="#DBEAFE"
        stroke="#0F172A"
        strokeWidth="3"
      />
      <path
        d="M152 80 l36 34 h-62 l-36 -34z"
        fill="#BFDBFE"
        stroke="#0F172A"
        strokeWidth="3"
      />
      <path
        d="M188 114 v62 l-36 -34 v-62z"
        fill="#93C5FD"
        stroke="#0F172A"
        strokeWidth="3"
      />
      <circle cx="130" cy="122" r="8" fill="#2563EB" />
      <path
        d="M246 60 h34 v34 h34 v34 h-34 v34 h-34 v-34 h-34 v-34 h34z"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="3"
      />
      <circle cx="263" cy="77" r="5" fill="#2563EB" />
      <path d="M288 106 l12 18 h-24z" fill="#2563EB" />
    </svg>
  );
}

function AnalyzerScreen({ message }: { message: string }) {
  return (
    <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-[0_20px_60px_-34px_rgba(15,23,42,0.35)]">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-slate-50 ring-1 ring-slate-200">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950" />
      </div>
      <h1 className="mt-7 text-3xl font-semibold tracking-tight text-slate-950">
        Calculating your IQ score
      </h1>
      <p className="mt-3 text-base font-medium text-slate-700">{message}</p>
      <div className="mx-auto mt-7 h-2 max-w-sm overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-slate-950" />
      </div>
    </section>
  );
}

function PaywallScreen({
  lockedIq,
  percentile,
  lockedArchetype,
  domainScores
}: {
  lockedIq: number;
  percentile: number;
  lockedArchetype: string;
  domainScores: DomainScore[];
}) {
  return (
    <section className="w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.42)] sm:p-8">
      <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white">
          <BrainCircuit className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Your IQ Score Is Ready
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-slate-600">
          Your report has generated an IQ score, percentile, domain map, and
          Brain Archetype from 30 timed reasoning items.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <ResultCard label="IQ Score" value={String(lockedIq)} />
        <ResultCard
          label="IQ Percentile"
          value={`Top ${100 - percentile}%`}
        />
        <ResultCard label="Brain Archetype" value={lockedArchetype} />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-950">Domain map</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {domainScores.map((item) => (
            <div key={item.domain}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                <span>{item.label}</span>
                <span>{item.score}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                <div
                  className="h-full rounded-full bg-slate-950"
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-800">
        Preview mode: payment is disabled, so the full IQ report is visible.
      </div>
    </section>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className="mt-3 overflow-hidden rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-2xl font-semibold tracking-tight text-slate-950">
          {value}
        </p>
      </div>
    </div>
  );
}
