import type { TranslationStatus } from '@/lib/i18n/types';

export type { TranslationStatus };

export const TRANSLATION_INDEXABLE_QUALITY_SCORE = 85;

export type TranslationQualityInput = {
  translationStatus: TranslationStatus;
  qualityScore?: number | null;
  hasLocalizedTitle: boolean;
  hasLocalizedH1: boolean;
  hasLocalizedBody: boolean;
  hasMixedLanguageRisk: boolean;
};

export function translationStatusIsPublished(
  status: TranslationStatus
): boolean {
  return status === 'published';
}

export function translationQualityScorePasses(
  qualityScore: number | null | undefined,
  threshold: number = TRANSLATION_INDEXABLE_QUALITY_SCORE
): boolean {
  return typeof qualityScore === 'number' && qualityScore >= threshold;
}

export function translationContentQualityReasons({
  translationStatus,
  qualityScore,
  hasLocalizedTitle,
  hasLocalizedH1,
  hasLocalizedBody,
  hasMixedLanguageRisk
}: TranslationQualityInput): string[] {
  const reasons: string[] = [];
  if (!translationStatusIsPublished(translationStatus)) {
    reasons.push(`Translation status is ${translationStatus}, not published.`);
  }
  if (!translationQualityScorePasses(qualityScore)) {
    reasons.push(
      `Translation quality score is below ${TRANSLATION_INDEXABLE_QUALITY_SCORE}.`
    );
  }
  if (!hasLocalizedTitle) reasons.push('Localized title is missing.');
  if (!hasLocalizedH1) reasons.push('Localized H1 is missing.');
  if (!hasLocalizedBody) reasons.push('Localized body content is missing.');
  if (hasMixedLanguageRisk) reasons.push('Mixed-language risk is present.');
  return reasons;
}

