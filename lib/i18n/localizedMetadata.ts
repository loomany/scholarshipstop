import type { Metadata } from 'next';

import { buildLocalizedAlternates } from '@/lib/i18n/alternates';
import type { SupportedLocale } from '@/lib/i18n/types';
import {
  availableLocalesForPilotPath,
  type LocalizedPilotPage
} from '@/lib/i18n/staticTranslations';
import { getLocalizedCanonical } from '@/lib/seo/canonical';

export function hasSearchParams(
  searchParams?: Record<string, string | string[] | undefined>
): boolean {
  if (!searchParams) return false;
  return Object.keys(searchParams).some((key) => {
    const value = searchParams[key];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined;
  });
}

export function buildLocalizedPilotMetadata({
  page,
  searchParams
}: {
  page: LocalizedPilotPage;
  searchParams?: Record<string, string | string[] | undefined>;
}): Metadata {
  const nonCanonicalView = hasSearchParams(searchParams);
  const availableLocales = availableLocalesForPilotPath(
    page.canonicalPath
  ) as SupportedLocale[];
  const alternates = buildLocalizedAlternates({
    canonicalPath: page.canonicalPath,
    currentLocale: page.locale,
    availableLocales,
    defaultUrl: getLocalizedCanonical(page.canonicalPath, 'en')
  });

  return {
    title: page.title,
    description: page.metaDescription,
    alternates,
    ...(nonCanonicalView
      ? {
          robots: {
            index: false,
            follow: true
          }
        }
      : {}),
    openGraph: {
      title: page.title,
      description: page.metaDescription,
      url: alternates.canonical,
      type:
        page.kind === 'essay' ||
        page.kind === 'compare' ||
        page.kind === 'resource' ||
        page.kind === 'resourceShell'
          ? 'article'
          : 'website',
      siteName: 'ScholarshipTop',
      locale: page.locale === 'es' ? 'es_ES' : 'fr_FR'
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.metaDescription
    }
  };
}
