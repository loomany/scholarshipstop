import type { ContentTranslationRow } from '@/lib/i18n/contentTranslationsTypes';
import {
  isPublishedTranslation,
  shouldExposeTranslatedRoute,
  shouldIndexTranslatedContent
} from '@/lib/i18n/contentTranslationsTypes';
import type { TranslationSeoRobots } from '@/lib/i18n/types';

export type TranslatedDbPagePolicyInput = {
  translation: Pick<ContentTranslationRow, 'status' | 'quality_score'> | null;
  englishIndexable: boolean;
  hasLocalizedTitle?: boolean;
  hasLocalizedH1?: boolean;
  hasLocalizedBody?: boolean;
  hasMixedLanguageRisk?: boolean;
};

export function canIncludeTranslatedDbPageInSitemap(
  input: TranslatedDbPagePolicyInput
): boolean {
  return shouldIndexTranslatedContent(input);
}

export function canAddTranslatedDbHreflang(
  input: TranslatedDbPagePolicyInput
): boolean {
  return shouldIndexTranslatedContent(input);
}

export function getTranslatedDbRobots(
  input: TranslatedDbPagePolicyInput
): TranslationSeoRobots {
  return shouldIndexTranslatedContent(input) ? 'index, follow' : 'noindex, follow';
}

export function translatedDbPageIsPubliclyMissing(
  translation: Pick<ContentTranslationRow, 'status'> | null | undefined
): boolean {
  if (!translation) return true;
  return !isPublishedTranslation(translation.status);
}

export function translatedDbPageIsDraftOrBlocked(
  status: ContentTranslationRow['status'] | null | undefined
): boolean {
  if (!status) return true;
  return !shouldExposeTranslatedRoute({ status });
}
