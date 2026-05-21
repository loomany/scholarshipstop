import { STATIC_COMPARE_GUIDES } from '@/lib/compare/staticCompareGuides';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { getLocalizedPilotPage } from '@/lib/i18n/staticTranslations';

export type StaticCompareGuideCardCopy = {
  title: string;
  description: string;
};

export function getStaticCompareGuideCardCopy(
  locale: LocalizedUiLocale,
  slug: string
): StaticCompareGuideCardCopy {
  const english =
    STATIC_COMPARE_GUIDES.find((guide) => guide.slug === slug) ?? null;
  if (locale === 'en' || !english) {
    return {
      title: english?.h1 ?? slug,
      description: english?.shortAnswer ?? ''
    };
  }

  const canonicalPath = `/compare/${slug}`;
  const page = getLocalizedPilotPage(locale, canonicalPath);
  if (page) {
    return {
      title: page.h1,
      description: page.subtitle?.trim() || page.intro
    };
  }

  return {
    title: english.h1,
    description: english.shortAnswer
  };
}
