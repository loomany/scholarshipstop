import 'server-only';

import { buildLocalizedAlternates } from '@/lib/i18n/alternates';
import { essayHubArticlePath } from '@/lib/essays/essayHubSection';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { STAGE2_PILOT_LOCALES } from '@/lib/i18n/pilotRoutes';
import { ROOT_LOCALE } from '@/lib/i18n/locales';
import {
  fetchPublishedEssayGuide,
  type PublishedEssayGuideContext
} from '@/lib/i18n/essayPilot/resolveLocalizedEssayGuide';
import type { SupportedLocale } from '@/lib/i18n/types';
import { getLocalizedCanonical } from '@/lib/seo/canonical';

export async function buildEssayGuideAlternates({
  slug,
  currentLocale,
  resolved
}: {
  slug: string;
  currentLocale: SupportedLocale;
  resolved?: PublishedEssayGuideContext | null;
}): Promise<ReturnType<typeof buildLocalizedAlternates>> {
  const englishPath = essayHubArticlePath(slug);
  const available: SupportedLocale[] = [ROOT_LOCALE];

  for (const locale of STAGE2_PILOT_LOCALES) {
    const ctx =
      locale === currentLocale && resolved
        ? resolved
        : await fetchPublishedEssayGuide(slug, locale);
    if (ctx) available.push(locale);
  }

  return buildLocalizedAlternates({
    canonicalPath: englishPath,
    currentLocale: currentLocale === ROOT_LOCALE ? ROOT_LOCALE : currentLocale,
    availableLocales: available,
    defaultUrl: getLocalizedCanonical(englishPath, ROOT_LOCALE)
  });
}

export async function essayGuidePublishedForLocale(
  slug: string,
  locale: ContentTranslationLocale
): Promise<boolean> {
  return (await fetchPublishedEssayGuide(slug, locale)) != null;
}
