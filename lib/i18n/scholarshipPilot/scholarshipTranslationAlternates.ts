import 'server-only';

import { buildLocalizedAlternates } from '@/lib/i18n/alternates';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { STAGE2_PILOT_LOCALES } from '@/lib/i18n/pilotRoutes';
import { ROOT_LOCALE } from '@/lib/i18n/locales';
import {
  fetchPublishedScholarshipDetail,
  type PublishedScholarshipDetailContext
} from '@/lib/i18n/scholarshipPilot/resolveLocalizedScholarshipDetail';
import type { SupportedLocale } from '@/lib/i18n/types';
import { getLocalizedCanonical } from '@/lib/seo/canonical';

function scholarshipEnglishPath(slug: string): string {
  return `/scholarships/${encodeURIComponent(slug)}`;
}

export async function buildScholarshipDetailAlternates({
  slug,
  currentLocale,
  resolved
}: {
  slug: string;
  currentLocale: SupportedLocale;
  resolved?: PublishedScholarshipDetailContext | null;
}): Promise<ReturnType<typeof buildLocalizedAlternates>> {
  const englishPath = scholarshipEnglishPath(slug);
  const available: SupportedLocale[] = [ROOT_LOCALE];

  for (const locale of STAGE2_PILOT_LOCALES) {
    const ctx =
      locale === currentLocale && resolved
        ? resolved
        : await fetchPublishedScholarshipDetail(slug, locale);
    if (ctx) available.push(locale);
  }

  return buildLocalizedAlternates({
    canonicalPath: englishPath,
    currentLocale: currentLocale === ROOT_LOCALE ? ROOT_LOCALE : currentLocale,
    availableLocales: available,
    defaultUrl: getLocalizedCanonical(englishPath, ROOT_LOCALE)
  });
}

export async function scholarshipDetailTranslationPublishedForLocale(
  slug: string,
  locale: ContentTranslationLocale
): Promise<boolean> {
  const ctx = await fetchPublishedScholarshipDetail(slug, locale);
  return ctx != null;
}
