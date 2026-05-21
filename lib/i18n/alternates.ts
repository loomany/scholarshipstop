import { ROOT_LOCALE, isSupportedLocale } from '@/lib/i18n/locales';
import type { LocalizedAlternates, SupportedLocale } from '@/lib/i18n/types';
import { getLocalizedCanonical } from '@/lib/seo/canonical';

export type BuildLocalizedAlternatesInput = {
  canonicalPath: string;
  currentLocale: SupportedLocale;
  availableLocales: readonly SupportedLocale[];
  defaultUrl?: string;
};

function uniquePublishedLocales(
  locales: readonly SupportedLocale[]
): SupportedLocale[] {
  const out: SupportedLocale[] = [];
  const seen = new Set<string>();
  for (const locale of locales) {
    if (!isSupportedLocale(locale) || seen.has(locale)) continue;
    seen.add(locale);
    out.push(locale);
  }
  return out;
}

export function buildLocalizedAlternates({
  canonicalPath,
  currentLocale,
  availableLocales,
  defaultUrl
}: BuildLocalizedAlternatesInput): LocalizedAlternates {
  const canonical = getLocalizedCanonical(canonicalPath, currentLocale);
  const publishedLocales = uniquePublishedLocales(availableLocales);
  const languages: Record<string, string> = {};

  for (const locale of publishedLocales) {
    languages[locale] = getLocalizedCanonical(canonicalPath, locale);
  }

  languages['x-default'] =
    defaultUrl?.trim() || getLocalizedCanonical(canonicalPath, ROOT_LOCALE);

  return { canonical, languages };
}

