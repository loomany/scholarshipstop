import type {
  TranslatedPageSeoDecision,
  TranslationStatus
} from '@/lib/i18n/types';
import { translationContentQualityReasons } from '@/lib/i18n/translationQuality';

export type { TranslationStatus };

export type TranslatedPageSeoDecisionInput = {
  sourceIndexable: boolean;
  translationStatus: TranslationStatus;
  qualityScore?: number | null;
  hasLocalizedTitle: boolean;
  hasLocalizedH1: boolean;
  hasLocalizedBody: boolean;
  hasMixedLanguageRisk: boolean;
};

export function getTranslatedPageSeoDecision({
  sourceIndexable,
  ...qualityInput
}: TranslatedPageSeoDecisionInput): TranslatedPageSeoDecision {
  const reasons = translationContentQualityReasons(qualityInput);
  if (!sourceIndexable) {
    reasons.push('English source page is not indexable.');
  }

  const indexable = reasons.length === 0;
  return {
    indexable,
    robots: indexable ? 'index, follow' : 'noindex, follow',
    includeInSitemap: indexable,
    includeInHreflang: indexable,
    reasons: indexable
      ? ['Translated page meets indexable quality rules.']
      : reasons
  };
}

