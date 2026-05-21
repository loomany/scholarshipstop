import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import { STATIC_SCHOLARSHIP_GUIDES } from '@/lib/resources/staticScholarshipGuides';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { getLocalizedPilotPage } from '@/lib/i18n/staticTranslations';

export type StaticResourceGuideCardCopy = {
  title: string;
  description: string;
};

export function getStaticResourceGuideCardCopy(
  locale: LocalizedUiLocale,
  slug: string
): StaticResourceGuideCardCopy {
  const english =
    STATIC_SCHOLARSHIP_GUIDES.find((guide) => guide.slug === slug) ?? null;
  if (locale === 'en' || !english) {
    return {
      title: english?.title ?? slug,
      description: english?.description ?? ''
    };
  }

  const canonicalPath = resourcesArticlePath(slug);
  const page = getLocalizedPilotPage(locale, canonicalPath);
  if (page) {
    return {
      title: page.title,
      description: page.metaDescription?.trim() || page.intro
    };
  }

  return {
    title: english.title,
    description: english.description
  };
}
