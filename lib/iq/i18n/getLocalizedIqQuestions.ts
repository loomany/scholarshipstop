import {
  cognitiveAssessmentQuestions,
  type CognitiveAssessmentQuestion,
  type CognitiveOptionKey
} from '@/lib/cognitiveAssessmentQuestions';
import type { IqLocale } from '@/lib/iq/i18n/iqLocales';
import { IQ_QUESTION_OVERLAY_ES } from '@/lib/iq/i18n/questionOverlays/es';
import { IQ_QUESTION_OVERLAY_FR } from '@/lib/iq/i18n/questionOverlays/fr';
import type { QuestionTextOverlay } from '@/lib/iq/i18n/questionOverlays/types';

const OVERLAYS: Record<Exclude<IqLocale, 'en'>, Record<string, QuestionTextOverlay>> = {
  es: IQ_QUESTION_OVERLAY_ES,
  fr: IQ_QUESTION_OVERLAY_FR
};

function applyOverlay(
  question: CognitiveAssessmentQuestion,
  overlay: QuestionTextOverlay
): CognitiveAssessmentQuestion {
  return {
    ...question,
    prompt: overlay.prompt,
    options: { ...question.options, ...overlay.options },
    explanation: overlay.explanation,
    visual: question.visual
      ? {
          ...question.visual,
          title: overlay.visual?.title ?? question.visual.title,
          caption: overlay.visual?.caption ?? question.visual.caption
        }
      : undefined
  };
}

export function getLocalizedIqQuestions(
  locale: IqLocale
): CognitiveAssessmentQuestion[] {
  if (locale === 'en') {
    return cognitiveAssessmentQuestions;
  }

  const overlayMap = OVERLAYS[locale];
  return cognitiveAssessmentQuestions.map((question) => {
    const overlay = overlayMap[question.id];
    if (!overlay) {
      throw new Error(`Missing IQ question overlay for ${question.id} (${locale})`);
    }
    return applyOverlay(question, overlay);
  });
}

export function getLocalizedIqQuestionCount(locale: IqLocale): number {
  return getLocalizedIqQuestions(locale).length;
}

export function assertLocalizedQuestionBankParity(): void {
  const enIds = cognitiveAssessmentQuestions.map((q) => q.id);
  for (const locale of ['es', 'fr'] as const) {
    const bank = getLocalizedIqQuestions(locale);
    if (bank.length !== enIds.length) {
      throw new Error(`Question count mismatch for ${locale}`);
    }
    for (let i = 0; i < enIds.length; i += 1) {
      const en = cognitiveAssessmentQuestions[i]!;
      const localized = bank[i]!;
      if (localized.id !== en.id) {
        throw new Error(`Order mismatch at index ${i} for ${locale}`);
      }
      if (localized.correct_option !== en.correct_option) {
        throw new Error(`correct_option changed for ${en.id} (${locale})`);
      }
      if (localized.weight !== en.weight) {
        throw new Error(`weight changed for ${en.id} (${locale})`);
      }
      for (const key of ['A', 'B', 'C', 'D'] as CognitiveOptionKey[]) {
        if (!(key in localized.options)) {
          throw new Error(`Missing option ${key} for ${en.id} (${locale})`);
        }
      }
      if (!localized.prompt.trim() || !localized.explanation.trim()) {
        throw new Error(`Empty prompt/explanation for ${en.id} (${locale})`);
      }
    }
  }
}
