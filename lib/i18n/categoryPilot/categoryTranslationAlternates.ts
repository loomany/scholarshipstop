import 'server-only';

import { buildLocalizedAlternates } from '@/lib/i18n/alternates';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { STAGE2_PILOT_LOCALES } from '@/lib/i18n/pilotRoutes';
import { ROOT_LOCALE } from '@/lib/i18n/locales';
import type { SupportedLocale } from '@/lib/i18n/types';
import { getLocalizedCanonical } from '@/lib/seo/canonical';
import { fetchPublishedCategoryTranslation } from '@/lib/i18n/categoryPilot/resolveLocalizedCategoryPage';

export async function buildCategoryPilotAlternates({
  canonicalSlug,
  currentLocale
}: {
  canonicalSlug: string;
  currentLocale: SupportedLocale;
}) {
  const englishPath = `/scholarships/category/${canonicalSlug}`;
  const available: SupportedLocale[] = ['en'];

  for (const locale of STAGE2_PILOT_LOCALES) {
    const row = await fetchPublishedCategoryTranslation(canonicalSlug, locale);
    if (row) available.push(locale);
  }

  return buildLocalizedAlternates({
    canonicalPath: englishPath,
    currentLocale:
      currentLocale === ROOT_LOCALE ? ROOT_LOCALE : currentLocale,
    availableLocales: available,
    defaultUrl: getLocalizedCanonical(englishPath, ROOT_LOCALE)
  });
}
