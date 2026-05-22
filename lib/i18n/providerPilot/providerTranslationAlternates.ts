import 'server-only';

import { buildLocalizedAlternates } from '@/lib/i18n/alternates';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { STAGE2_PILOT_LOCALES } from '@/lib/i18n/pilotRoutes';
import { ROOT_LOCALE } from '@/lib/i18n/locales';
import type { SupportedLocale } from '@/lib/i18n/types';
import { getLocalizedCanonical } from '@/lib/seo/canonical';
import {
  fetchPublishedProviderProfile,
  type PublishedProviderProfileContext
} from '@/lib/i18n/providerPilot/resolveLocalizedProviderPage';

function providerEnglishPath(slug: string): string {
  return `/providers/${encodeURIComponent(slug)}`;
}

export async function buildProviderProfileAlternates({
  slug,
  currentLocale,
  resolved
}: {
  slug: string;
  currentLocale: SupportedLocale;
  resolved?: PublishedProviderProfileContext | null;
}): Promise<ReturnType<typeof buildLocalizedAlternates>> {
  const englishPath = providerEnglishPath(slug);
  const available: SupportedLocale[] = [ROOT_LOCALE];

  for (const locale of STAGE2_PILOT_LOCALES) {
    const ctx =
      locale === currentLocale && resolved
        ? resolved
        : await fetchPublishedProviderProfile(slug, locale);
    if (ctx) available.push(locale);
  }

  return buildLocalizedAlternates({
    canonicalPath: englishPath,
    currentLocale: currentLocale === ROOT_LOCALE ? ROOT_LOCALE : currentLocale,
    availableLocales: available,
    defaultUrl: getLocalizedCanonical(englishPath, ROOT_LOCALE)
  });
}

export async function providerTranslationPublishedForLocale(
  slug: string,
  locale: ContentTranslationLocale
): Promise<boolean> {
  const ctx = await fetchPublishedProviderProfile(slug, locale);
  return ctx != null;
}
