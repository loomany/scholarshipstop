import { STATIC_ESSAY_GUIDES } from '@/lib/essays/staticEssayGuides';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { getLocalizedPilotPage } from '@/lib/i18n/staticTranslations';
import { essayHubArticlePath } from '@/lib/essays/essayHubSection';

export type StaticEssayGuideCardCopy = {
  title: string;
  description: string;
};

export function getStaticEssayGuideCardCopy(
  locale: LocalizedUiLocale,
  slug: string
): StaticEssayGuideCardCopy {
  const english =
    STATIC_ESSAY_GUIDES.find((guide) => guide.slug === slug) ?? null;
  if (locale === 'en' || !english) {
    return {
      title: english?.h1 ?? slug,
      description: english?.oneSentence ?? english?.description ?? ''
    };
  }

  const page = getLocalizedPilotPage(locale, essayHubArticlePath(slug));
  if (page) {
    return {
      title: page.h1,
      description: page.subtitle?.trim() || page.intro
    };
  }

  return {
    title: english.h1,
    description: english.oneSentence
  };
}
