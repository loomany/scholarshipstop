import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';

const NOTICES: Record<ContentTranslationLocale, string> = {
  es: 'Esta página está disponible actualmente en inglés. La traducción al español está pendiente.',
  fr: 'Cette page est actuellement disponible en anglais. La traduction française est en cours.'
};

export function getEnglishFallbackNotice(locale: ContentTranslationLocale): string {
  return NOTICES[locale];
}
