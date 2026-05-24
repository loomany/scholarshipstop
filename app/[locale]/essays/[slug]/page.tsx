import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import LocalizedEssayGuidePage from '@/components/essays/LocalizedEssayGuidePage';
import { getContentTranslationSeoDecision } from '@/lib/i18n/contentTranslationsServer';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { buildEssayGuideAlternates } from '@/lib/i18n/essayPilot/essayTranslationAlternates';
import { fetchPublishedEssayGuide } from '@/lib/i18n/essayPilot/resolveLocalizedEssayGuide';
import { getStaticEssayGuide } from '@/lib/essays/staticEssayGuides';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';
import {
  getEssaySeoQualityPolicy,
  MIN_LOCALIZED_ESSAY_VISIBLE_WORDS
} from '@/lib/seo/essaySeoQualityPolicy';
import { countVisibleWords, hasRawPlaceholderText } from '@/lib/seo/visibleText';

export const revalidate = 300;
export const dynamicParams = true;

type PageProps = { params: { locale: string; slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!isStage2PilotLocale(params.locale)) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }
  const locale = params.locale as Stage2PilotLocale;
  const slug = decodeURIComponent(params.slug ?? '').trim().toLowerCase();
  if (!slug || getStaticEssayGuide(slug)) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }

  const resolved = await fetchPublishedEssayGuide(slug, locale);
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
  const quality = getEssaySeoQualityPolicy({
    stablePublicRoute: true,
    hasQueryParams: false,
    hasTitle: Boolean(resolved.copy.metaTitle.trim()),
    hasH1: Boolean(resolved.copy.headline.trim()),
    hasBody: Boolean(resolved.copy.bodyHtml.trim()),
    localized: true,
    hasLocalizedTitle: Boolean(resolved.copy.metaTitle.trim()),
    hasLocalizedH1: Boolean(resolved.copy.headline.trim()),
    hasLocalizedBody: Boolean(resolved.copy.bodyHtml.trim()),
    visibleWordCount: countVisibleWords(
      resolved.copy.headline,
      resolved.copy.intro,
      resolved.copy.bodyHtml
    ),
    minimumVisibleWords: MIN_LOCALIZED_ESSAY_VISIBLE_WORDS,
    hasRawPlaceholder: hasRawPlaceholderText(
      resolved.copy.headline,
      resolved.copy.bodyHtml
    )
  });

  const alternates = await buildEssayGuideAlternates({
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

export default async function LocalizedEssayGuideRoute({ params }: PageProps) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const locale = params.locale as Stage2PilotLocale;
  const slug = decodeURIComponent(params.slug ?? '').trim().toLowerCase();
  if (!slug || getStaticEssayGuide(slug)) notFound();

  const resolved = await fetchPublishedEssayGuide(
    slug,
    locale as ContentTranslationLocale
  );
  if (!resolved) notFound();

  return (
    <LocalizedEssayGuidePage
      locale={locale}
      slug={slug}
      essay={resolved.essay}
      copy={resolved.copy}
    />
  );
}
