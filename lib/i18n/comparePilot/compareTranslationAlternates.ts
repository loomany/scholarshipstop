import 'server-only';

import { buildLocalizedAlternates } from '@/lib/i18n/alternates';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import {
  fetchPublishedCompareState,
  fetchPublishedCompareUniversity,
  type PublishedCompareStateContext,
  type PublishedCompareUniversityContext
} from '@/lib/i18n/comparePilot/resolveLocalizedCompare';
import { STAGE2_PILOT_LOCALES } from '@/lib/i18n/pilotRoutes';
import { ROOT_LOCALE } from '@/lib/i18n/locales';
import type { SupportedLocale } from '@/lib/i18n/types';
import { getLocalizedCanonical } from '@/lib/seo/canonical';

export async function buildCompareUniversityAlternates({
  slug,
  currentLocale,
  resolved
}: {
  slug: string;
  currentLocale: SupportedLocale;
  resolved?: PublishedCompareUniversityContext | null;
}) {
  const englishPath = `/compare/universities/${slug}`;
  const available: SupportedLocale[] = [ROOT_LOCALE];
  for (const locale of STAGE2_PILOT_LOCALES) {
    const ctx =
      locale === currentLocale && resolved
        ? resolved
        : await fetchPublishedCompareUniversity(slug, locale);
    if (ctx) available.push(locale);
  }
  return buildLocalizedAlternates({
    canonicalPath: englishPath,
    currentLocale: currentLocale === ROOT_LOCALE ? ROOT_LOCALE : currentLocale,
    availableLocales: available,
    defaultUrl: getLocalizedCanonical(englishPath, ROOT_LOCALE)
  });
}

export async function buildCompareStateAlternates({
  slug,
  currentLocale,
  resolved
}: {
  slug: string;
  currentLocale: SupportedLocale;
  resolved?: PublishedCompareStateContext | null;
}) {
  const englishPath = `/compare/states/${slug}`;
  const available: SupportedLocale[] = [ROOT_LOCALE];
  for (const locale of STAGE2_PILOT_LOCALES) {
    const ctx =
      locale === currentLocale && resolved
        ? resolved
        : await fetchPublishedCompareState(slug, locale);
    if (ctx) available.push(locale);
  }
  return buildLocalizedAlternates({
    canonicalPath: englishPath,
    currentLocale: currentLocale === ROOT_LOCALE ? ROOT_LOCALE : currentLocale,
    availableLocales: available,
    defaultUrl: getLocalizedCanonical(englishPath, ROOT_LOCALE)
  });
}
