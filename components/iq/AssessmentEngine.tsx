'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BrainCircuit, Clock3, RotateCcw, Timer } from 'lucide-react';

import { useOptionalIqLocale } from '@/components/iq/IqLocaleProvider';
import type {
  CognitiveAssessmentQuestion,
  CognitiveOptionKey,
  CognitiveVisualKind
} from '@/lib/cognitiveAssessmentQuestions';
import {
  getIqDifficultyLabel,
  getIqDomainLabel
} from '@/lib/iq/i18n/iqAssessmentLabels';
import { getIqAssessmentUiCopy } from '@/lib/iq/i18n/iqAssessmentUiCopy';
import { getLocalizedIqQuestions } from '@/lib/iq/i18n/getLocalizedIqQuestions';
import type { IqLocale } from '@/lib/iq/i18n/iqLocales';
import type { AssessmentResult } from '@/lib/iqAssessmentTypes';
import { cn } from '@/utils/cn';

import {
  calculateDomainScores,
  iqScoreFromWeightedScore,
  lockedArchetype,
  optionKeys,
  percentileFromIq,
  scoreQuestionBank,
  type AnswerMap
} from './assessmentScoring';

type AssessmentPhase = 'intro' | 'assessment' | 'analyzing';

type AssessmentDraft = {
  locale: IqLocale;
  phase: AssessmentPhase;
  currentIndex: number;
  answers: AnswerMap;
  timedOutQuestionIds: string[];
  assessmentStartedAt: number | null;
  questionStartedAt: number | null;
  updatedAt: string;
};

type AssessmentEngineProps = {
  storageKey: string;
  locale?: IqLocale;
  intro?: (onStart: () => void) => ReactNode;
  startImmediately?: boolean;
  onComplete: (result: AssessmentResult) => void;
};

const ASSESSMENT_TIME_LIMIT_SECONDS = 30 * 60;

function isOptionKey(value: unknown): value is CognitiveOptionKey {
  return typeof value === 'string' && optionKeys.includes(value as CognitiveOptionKey);
}

function readAssessmentDraft(
  storageKey: string,
  questions: CognitiveAssessmentQuestion[],
  activeLocale: IqLocale
): { draft: AssessmentDraft | null; localeSwitched: boolean } {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { draft: null, localeSwitched: false };
    const parsed = JSON.parse(raw) as Partial<AssessmentDraft> & {
      locale?: unknown;
      phase?: unknown;
      currentIndex?: unknown;
      answers?: unknown;
      timedOutQuestionIds?: unknown;
      assessmentStartedAt?: unknown;
      questionStartedAt?: unknown;
      updatedAt?: unknown;
    };

    let phase: AssessmentPhase | null = null;
    if (
      parsed.phase === 'intro' ||
      parsed.phase === 'assessment' ||
      parsed.phase === 'analyzing'
    ) {
      phase = parsed.phase;
    }
    if (!phase) return { draft: null, localeSwitched: false };

    const draftLocale: IqLocale =
      parsed.locale === 'es' || parsed.locale === 'fr' ? parsed.locale : 'en';
    const localeSwitched =
      draftLocale !== activeLocale &&
      (phase === 'assessment' || Object.keys(parsed.answers ?? {}).length > 0);

    const validQuestionIds = new Set(questions.map((q) => q.id));
    const answers: AnswerMap = {};
    if (parsed.answers && typeof parsed.answers === 'object') {
      for (const [questionId, value] of Object.entries(parsed.answers)) {
        if (validQuestionIds.has(questionId) && isOptionKey(value)) {
          answers[questionId] = value;
        }
      }
    }

    const timedOutQuestionIds = Array.isArray(parsed.timedOutQuestionIds)
      ? parsed.timedOutQuestionIds.filter(
          (questionId): questionId is string =>
            typeof questionId === 'string' && validQuestionIds.has(questionId)
        )
      : [];

    const questionCount = questions.length;
    let currentIndex =
      typeof parsed.currentIndex === 'number' && Number.isFinite(parsed.currentIndex)
        ? Math.max(0, Math.min(questionCount - 1, Math.floor(parsed.currentIndex)))
        : Math.min(Object.keys(answers).length, questionCount - 1);

    if (phase === 'assessment') {
      while (
        currentIndex < questions.length - 1 &&
        answers[questions[currentIndex]?.id ?? '']
      ) {
        currentIndex += 1;
      }
      if (
        currentIndex >= questions.length - 1 &&
        answers[questions[currentIndex]?.id ?? '']
      ) {
        phase = 'analyzing';
      }
    }

    return {
      draft: {
        locale: activeLocale,
        phase,
        currentIndex,
        answers,
        timedOutQuestionIds,
        assessmentStartedAt:
          typeof parsed.assessmentStartedAt === 'number' &&
          Number.isFinite(parsed.assessmentStartedAt)
            ? parsed.assessmentStartedAt
            : phase === 'assessment' || phase === 'analyzing'
              ? Date.now()
              : null,
        questionStartedAt:
          typeof parsed.questionStartedAt === 'number' &&
          Number.isFinite(parsed.questionStartedAt)
            ? parsed.questionStartedAt
            : phase === 'assessment'
              ? Date.now()
              : null,
        updatedAt:
          typeof parsed.updatedAt === 'string'
            ? parsed.updatedAt
            : new Date().toISOString()
      },
      localeSwitched
    };
  } catch {
    return { draft: null, localeSwitched: false };
  }
}

function writeAssessmentDraft(storageKey: string, draft: AssessmentDraft) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Ignore storage failures; the assessment should remain usable.
  }
}

function buildAssessmentResult(
  questions: CognitiveAssessmentQuestion[],
  answers: AnswerMap,
  timedOutQuestionIds: string[],
  locale: IqLocale,
  totalDurationSeconds?: number
): AssessmentResult {
  const weightedScore = scoreQuestionBank(questions, answers);
  const iqScore = iqScoreFromWeightedScore(weightedScore);
  const percentile = percentileFromIq(iqScore);
  const domainScores = calculateDomainScores(questions, answers, locale);

  return {
    answers,
    timedOutQuestionIds,
    totalDurationSeconds,
    weightedScore,
    iqScore,
    percentile,
    archetype: lockedArchetype(domainScores, locale),
    domainScores
  };
}

export default function AssessmentEngine({
  storageKey,
  locale: localeProp,
  intro,
  startImmediately = false,
  onComplete
}: AssessmentEngineProps) {
  const iqContext = useOptionalIqLocale();
  const locale = localeProp ?? iqContext?.locale ?? 'en';
  const questions = useMemo(
    () => getLocalizedIqQuestions(locale),
    [locale]
  );
  const ui = useMemo(() => getIqAssessmentUiCopy(locale), [locale]);
  const totalQuestions = questions.length;

  const [phase, setPhase] = useState<AssessmentPhase>(
    startImmediately ? 'assessment' : 'intro'
  );
  const [localeSwitchNotice, setLocaleSwitchNotice] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [timedOutQuestionIds, setTimedOutQuestionIds] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] =
    useState<CognitiveOptionKey | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [assessmentStartedAt, setAssessmentStartedAt] = useState<number | null>(
    startImmediately ? Date.now() : null
  );
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(
    startImmediately ? Date.now() : null
  );
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [restartNonce, setRestartNonce] = useState(0);
  const advancingRef = useRef(false);
  const completedRef = useRef(false);
  const advanceTimeoutRef = useRef<number | null>(null);

  const currentQuestion = questions[currentIndex] ?? questions[0];
  const step = currentIndex + 1;
  const progress = Math.round((step / totalQuestions) * 100);
  const totalRemainingSeconds = Math.max(
    0,
    ASSESSMENT_TIME_LIMIT_SECONDS - totalElapsedSeconds
  );

  useEffect(() => {
    const { draft, localeSwitched } = readAssessmentDraft(
      storageKey,
      questions,
      locale
    );
    if (draft) {
      setPhase(draft.phase);
      setCurrentIndex(draft.currentIndex);
      setAnswers(draft.answers);
      setTimedOutQuestionIds(draft.timedOutQuestionIds);
      setAssessmentStartedAt(draft.assessmentStartedAt);
      setTotalElapsedSeconds(
        draft.assessmentStartedAt
          ? Math.max(0, Math.floor((Date.now() - draft.assessmentStartedAt) / 1000))
          : 0
      );
      setQuestionStartedAt(draft.questionStartedAt);
      setSelectedOption(null);
      setLocaleSwitchNotice(localeSwitched);
    } else if (startImmediately) {
      const startedAt = Date.now();
      setAssessmentStartedAt(startedAt);
      setTotalElapsedSeconds(0);
      setQuestionStartedAt(startedAt);
    }
    setDraftHydrated(true);
  }, [locale, questions, startImmediately, storageKey]);

  useEffect(() => {
    if (!draftHydrated) return;
    writeAssessmentDraft(storageKey, {
      locale,
      phase,
      currentIndex,
      answers,
      timedOutQuestionIds,
      assessmentStartedAt,
      questionStartedAt,
      updatedAt: new Date().toISOString()
    });
  }, [
    answers,
    assessmentStartedAt,
    currentIndex,
    draftHydrated,
    locale,
    phase,
    questionStartedAt,
    storageKey,
    timedOutQuestionIds
  ]);

  useEffect(() => {
    if (phase !== 'analyzing') return;

    setMessageIndex(0);
    const interval = window.setInterval(() => {
      setMessageIndex((index) =>
        Math.min(index + 1, ui.analyzerMessages.length - 1)
      );
    }, 900);
    const done = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Ignore storage failures.
      }
      onComplete(
        buildAssessmentResult(
          questions,
          answers,
          timedOutQuestionIds,
          locale,
          assessmentStartedAt
            ? Math.max(1, Math.round((Date.now() - assessmentStartedAt) / 1000))
            : undefined
        )
      );
    }, 3000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(done);
    };
  }, [
    answers,
    assessmentStartedAt,
    onComplete,
    phase,
    storageKey,
    timedOutQuestionIds,
    questions,
    locale,
    ui.analyzerMessages
  ]);

  useEffect(() => {
    if (!draftHydrated || phase !== 'assessment') return;
    if (questionStartedAt != null) return;
    setQuestionStartedAt(Date.now());
  }, [draftHydrated, phase, questionStartedAt]);

  useEffect(() => {
    if (
      !draftHydrated ||
      !assessmentStartedAt ||
      (phase !== 'assessment' && phase !== 'analyzing')
    ) {
      return;
    }

    const updateElapsed = () => {
      const elapsed = Math.max(
        0,
        Math.floor((Date.now() - assessmentStartedAt) / 1000)
      );
      setTotalElapsedSeconds(elapsed);
      if (phase === 'assessment' && elapsed >= ASSESSMENT_TIME_LIMIT_SECONDS) {
        if (advanceTimeoutRef.current != null) {
          window.clearTimeout(advanceTimeoutRef.current);
          advanceTimeoutRef.current = null;
        }
        const answered = new Set(Object.keys(answers));
        setTimedOutQuestionIds((previous) => [
          ...new Set([
            ...previous,
            ...questions
              .filter((question) => !answered.has(question.id))
              .map((question) => question.id)
          ])
        ]);
        setQuestionStartedAt(null);
        setSelectedOption(null);
        setPhase('analyzing');
      }
    };

    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(interval);
  }, [answers, assessmentStartedAt, draftHydrated, phase, questions]);

  const finishCurrentQuestion = useCallback(
    (delayMs = 0) => {
      if (advancingRef.current) return;
      advancingRef.current = true;

      advanceTimeoutRef.current = window.setTimeout(() => {
        if (currentIndex >= totalQuestions - 1) {
          setQuestionStartedAt(null);
          setPhase('analyzing');
          advancingRef.current = false;
          return;
        }

        const nextIndex = currentIndex + 1;
        const startedAt = Date.now();
        setCurrentIndex(nextIndex);
        setQuestionStartedAt(startedAt);
        setSelectedOption(null);
        advancingRef.current = false;
      }, delayMs);
    },
    [currentIndex, totalQuestions]
  );

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
    if (advanceTimeoutRef.current != null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage failures; state reset below is the source of truth.
    }
    completedRef.current = false;
    advancingRef.current = false;
    setRestartNonce((nonce) => nonce + 1);
    setAnswers({});
    setTimedOutQuestionIds([]);
    setCurrentIndex(0);
    setSelectedOption(null);
    setAssessmentStartedAt(startedAt);
    setTotalElapsedSeconds(0);
    setQuestionStartedAt(startedAt);
    setPhase('assessment');
  };

  return (
    <main className="fixed inset-0 z-[200] overflow-y-auto bg-[#F8FAFC] text-slate-950">
      {localeSwitchNotice ? (
        <p
          role="status"
          data-iq-assessment-locale-notice="true"
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950 sm:text-sm"
        >
          {ui.localeSwitchNotice}
        </p>
      ) : null}
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col px-4 pb-2.5 pt-[calc(4rem+env(safe-area-inset-top,0px)+0.75rem)] sm:px-6 sm:pb-5 sm:pt-[calc(4rem+env(safe-area-inset-top,0px)+1rem)] md:min-h-[calc(100dvh-5rem)] md:pt-[calc(5rem+env(safe-area-inset-top,0px)+1rem)] lg:px-8">
        <ProgressHeader
          progress={
            !draftHydrated
              ? 0
              : phase === 'intro'
                ? 0
                : phase === 'analyzing'
                  ? 100
                  : progress
          }
          step={phase === 'intro' ? 0 : Math.min(step, totalQuestions)}
          stepLabel={ui.stepOf}
          totalQuestions={totalQuestions}
        />

        <div
          className={cn(
            'flex flex-1 justify-center',
            phase === 'intro'
              ? 'items-start pt-6 pb-8 sm:pt-8 sm:pb-12'
              : phase === 'assessment'
                ? 'items-start pt-3 pb-5 sm:pt-10 sm:pb-12 lg:pt-5 lg:pb-6'
                : 'items-center py-8 sm:py-12'
          )}
        >
          {draftHydrated && phase === 'intro'
            ? intro?.(startAssessment) ?? (
                <AssessmentIntro locale={locale} onStart={startAssessment} />
              )
            : null}

          {draftHydrated && phase === 'assessment' && currentQuestion ? (
            <QuestionScreen
              key={`${currentQuestion.id}-${restartNonce}-${locale}`}
              locale={locale}
              question={currentQuestion}
              step={step}
              totalRemainingSeconds={totalRemainingSeconds}
              selectedOption={selectedOption}
              onAnswer={answerQuestion}
              onRestart={startAssessment}
              ui={ui}
            />
          ) : null}

          {draftHydrated && phase === 'analyzing' ? (
            <AnalyzerScreen
              title={ui.analyzerTitle}
              message={ui.analyzerMessages[messageIndex] ?? ui.analyzerMessages[0]!}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

export function AssessmentIntro({
  locale,
  onStart
}: {
  locale: IqLocale;
  onStart: () => void;
}) {
  const ui = getIqAssessmentUiCopy(locale);
  const summaryCards = [
    { title: ui.introCardItems, description: ui.introCardItemsDesc },
    { title: ui.introCardDomains, description: ui.introCardDomainsDesc },
    { title: ui.introCardScore, description: ui.introCardScoreDesc }
  ];

  return (
    <section className="w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.42)] sm:p-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
        <BrainCircuit className="h-4 w-4" aria-hidden />
        {ui.introBadge}
      </div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
        {ui.introTitle}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
        {ui.introBody}
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
        {ui.startTest}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </section>
  );
}

function ProgressHeader({
  progress,
  step,
  stepLabel,
  totalQuestions
}: {
  progress: number;
  step: number;
  stepLabel: (step: number, total: number) => string;
  totalQuestions: number;
}) {
  return (
    <header className="mx-auto w-full border-b border-slate-200 pb-3 sm:pb-5 lg:pb-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <p className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold tabular-nums text-slate-600 shadow-sm sm:py-1.5 sm:text-sm">
          {stepLabel(step, totalQuestions)}
        </p>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 sm:h-2">
          <div
            className="h-full rounded-full bg-slate-950 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="min-w-10 text-right text-xs font-semibold tabular-nums text-slate-500 sm:min-w-12 sm:text-sm">
          {progress}%
        </span>
      </div>
    </header>
  );
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function QuestionScreen({
  locale,
  question,
  step,
  totalRemainingSeconds,
  selectedOption,
  onAnswer,
  onRestart,
  ui
}: {
  locale: IqLocale;
  question: CognitiveAssessmentQuestion;
  step: number;
  totalRemainingSeconds: number;
  selectedOption: CognitiveOptionKey | null;
  onAnswer: (optionKey: CognitiveOptionKey) => void;
  onRestart: () => void;
  ui: ReturnType<typeof getIqAssessmentUiCopy>;
}) {
  return (
    <section className="w-full">
      <div className="mb-4 text-center sm:mb-6 lg:mb-5">
        <div className="mx-auto grid max-w-[20rem] grid-cols-2 gap-1.5 rounded-[1.15rem] border border-slate-200/80 bg-white/80 p-1 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.45)] backdrop-blur sm:flex sm:max-w-none sm:flex-wrap sm:items-center sm:justify-center sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
          <span className="inline-flex min-h-7 items-center justify-center rounded-full bg-slate-950 px-2.5 py-1 text-center text-[0.6rem] font-bold uppercase tracking-[0.08em] text-white shadow-sm sm:min-h-0 sm:px-3 sm:text-xs sm:tracking-[0.14em]">
            {getIqDomainLabel(locale, question.domain)}
          </span>
          <span className="inline-flex min-h-7 items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-center text-[0.6rem] font-bold uppercase tracking-[0.08em] text-slate-500 shadow-sm sm:min-h-0 sm:px-3 sm:text-xs sm:tracking-[0.14em]">
            {getIqDifficultyLabel(locale, question.difficulty)}
          </span>
          <span className="inline-flex min-h-7 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-center text-[0.6rem] font-bold uppercase tracking-[0.08em] text-slate-500 shadow-sm sm:min-h-0 sm:gap-1.5 sm:px-3 sm:text-xs sm:tracking-[0.14em]">
            <Timer className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
            <span className="whitespace-nowrap">
              {ui.timeLeft(formatCountdown(totalRemainingSeconds))}
            </span>
          </span>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex min-h-7 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-center text-[0.6rem] font-bold uppercase tracking-[0.08em] text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 sm:min-h-0 sm:gap-1.5 sm:px-3 sm:text-xs sm:tracking-[0.14em]"
          >
            <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
            <span className="whitespace-nowrap">{ui.startAgain}</span>
          </button>
        </div>
        <h1 className="mx-auto mt-2 max-w-3xl rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 text-[1.08rem] font-semibold leading-snug tracking-tight text-slate-950 shadow-[0_16px_44px_-34px_rgba(15,23,42,0.55)] sm:mt-3 sm:rounded-[1.6rem] sm:px-6 sm:py-4 sm:text-3xl sm:leading-tight lg:text-[2rem]">
          {question.prompt}
        </h1>
      </div>

      <div
        className={cn(
          'rounded-[1.5rem] border border-slate-200 bg-white p-3.5 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.35)] sm:rounded-[2rem] sm:p-6 lg:p-5',
          question.visual
            ? 'lg:grid lg:min-h-[430px] lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-5'
            : 'mx-auto max-w-3xl'
        )}
      >
        {question.visual ? <CognitiveVisualCard question={question} /> : null}

        <div className="lg:sticky lg:top-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">
              {ui.chooseOneAnswer}
            </p>
            <p className="text-xs font-medium text-slate-400">
              {ui.questionNumber(step)}
            </p>
          </div>

          <div className="grid gap-3 lg:gap-2.5">
            {optionKeys.map((optionKey) => {
              const selected = selectedOption === optionKey;
              return (
                <button
                  key={`${question.id}-${optionKey}`}
                  type="button"
                  onClick={() => onAnswer(optionKey)}
                  disabled={selectedOption !== null}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-default lg:p-3.5',
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
                  <span className="min-w-0 flex-1 text-base font-medium leading-6 text-slate-800 lg:text-sm lg:leading-5">
                    {question.options[optionKey]}
                  </span>
                </button>
              );
            })}
          </div>
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
    <div className="mb-4 overflow-hidden rounded-[1.35rem] border border-slate-200 bg-slate-50 sm:mb-5 sm:rounded-[1.5rem] lg:mb-0">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3.5 py-2.5 sm:px-4 sm:py-3">
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
      <div className="grid min-h-48 place-items-center p-3.5 sm:min-h-56 sm:p-5 lg:min-h-[330px]">
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
    <svg viewBox="0 0 360 220" className="h-44 w-full max-w-xl sm:h-56" role="img">
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
    <svg viewBox="0 0 360 220" className="h-44 w-full max-w-xl sm:h-56" role="img">
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
    <svg viewBox="0 0 360 220" className="h-44 w-full max-w-xl sm:h-56" role="img">
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
    <svg viewBox="0 0 360 220" className="h-44 w-full max-w-xl sm:h-56" role="img">
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
    <svg viewBox="0 0 360 220" className="h-44 w-full max-w-xl sm:h-56" role="img">
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

function AnalyzerScreen({
  title,
  message
}: {
  title: string;
  message: string;
}) {
  return (
    <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-[0_20px_60px_-34px_rgba(15,23,42,0.35)]">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-slate-50 ring-1 ring-slate-200">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950" />
      </div>
      <h1 className="mt-7 text-3xl font-semibold tracking-tight text-slate-950">
        {title}
      </h1>
      <p className="mt-3 text-base font-medium text-slate-700">{message}</p>
      <div className="mx-auto mt-7 h-2 max-w-sm overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-slate-950" />
      </div>
    </section>
  );
}
