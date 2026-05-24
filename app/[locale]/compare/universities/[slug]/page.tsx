import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import LocalizedCompareDetailPage from '@/components/compare/LocalizedCompareDetailPage';
import { getContentTranslationSeoDecision } from '@/lib/i18n/contentTranslationsServer';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { buildCompareUniversityAlternates } from '@/lib/i18n/comparePilot/compareTranslationAlternates';
import { fetchPublishedCompareUniversity } from '@/lib/i18n/comparePilot/resolveLocalizedCompare';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';
import {
  getCompareSeoQualityPolicy,
  MIN_LOCALIZED_COMPARE_VISIBLE_WORDS
} from '@/lib/seo/compareSeoQualityPolicy';
import { countVisibleWords } from '@/lib/seo/visibleText';

export const revalidate = 300;
export const dynamicParams = true;

type PageProps = { params: { locale: string; slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!isStage2PilotLocale(params.locale)) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }
  const locale = params.locale as Stage2PilotLocale;
  const slug = decodeURIComponent(params.slug ?? '').trim().toLowerCase();
  if (!slug) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }

  const resolved = await fetchPublishedCompareUniversity(slug, locale);
  if (!resolved) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }

  const seo = getContentTranslationSeoDecision({
    translation: resolved.translation,
    englishIndexable: true,
    hasLocalizedTitle: Boolean(resolved.copy.metaTitle.trim()),
    hasLocalizedH1: Boolean(resolved.copy.headline.trim()),
    hasLocalizedBody: Boolean(resolved.copy.bodyHtml.trim())
  });
  const quality = getCompareSeoQualityPolicy({
    stablePublicRoute: true,
    hasQueryParams: false,
    hasSearchIntent: true,
    hasUniqueComparisonTable: false,
    hasVisibleFaq: resolved.copy.faq.length > 0,
    hasRelatedInternalLinks: true,
    meaningfulFactCount: resolved.copy.faq.length + 1,
    localized: true,
    hasLocalizedTitle: Boolean(resolved.copy.metaTitle.trim()),
    hasLocalizedH1: Boolean(resolved.copy.headline.trim()),
    hasLocalizedBody: Boolean(resolved.copy.bodyHtml.trim()),
    visibleWordCount: countVisibleWords(
      resolved.copy.headline,
      resolved.copy.intro,
      resolved.copy.bodyHtml
    ),
    minimumVisibleWords: MIN_LOCALIZED_COMPARE_VISIBLE_WORDS
  });

  const alternates = await buildCompareUniversityAlternates({
    slug,
    currentLocale: locale,
    resolved
  });

  const title = resolved.copy.metaTitle;
  const description = resolved.copy.metaDescription;

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      locale: locale === 'es' ? 'es_ES' : 'fr_FR'
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: seo.indexable && quality.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true }
  };
}

export default async function LocalizedUniversityCompareRoute({ params }: PageProps) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const locale = params.locale as Stage2PilotLocale;
  const slug = decodeURIComponent(params.slug ?? '').trim().toLowerCase();
  if (!slug) notFound();

  const resolved = await fetchPublishedCompareUniversity(
    slug,
    locale as ContentTranslationLocale
  );
  if (!resolved) notFound();

  const canonicalPath = `/compare/universities/${slug}`;
  const hubLabel =
    locale === 'es' ? 'Ver comparaciones universitarias' : 'Voir comparaisons universités';

  return (
    <LocalizedCompareDetailPage
      locale={locale}
      canonicalPath={canonicalPath}
      copy={resolved.copy}
      hubLabel={hubLabel}
      hubPath="/compare/universities"
    />
  );
}
