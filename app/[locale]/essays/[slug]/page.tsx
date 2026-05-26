import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import LocalizedEssayGuidePage from '@/components/essays/LocalizedEssayGuidePage';
import { essayHubArticlePath } from '@/lib/essays/essayHubSection';
import { getContentTranslationSeoDecision } from '@/lib/i18n/contentTranslationsServer';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { localizedNotFoundMetadata } from '@/lib/i18n/localizedNotFoundMetadata';
import { buildEnglishFallbackPageMetadata } from '@/lib/i18n/localizedContentFallbackMetadata';
import { buildEssayGuideAlternates } from '@/lib/i18n/essayPilot/essayTranslationAlternates';
import { resolveLocalizedEssayGuidePage } from '@/lib/i18n/essayPilot/resolveLocalizedEssayGuide';
import { getStaticEssayGuide } from '@/lib/essays/staticEssayGuides';
import {
  METADATA_NOT_FOUND,
  resolveStage2PilotLocaleFromParams
} from '@/lib/i18n/metadataRouteParams';
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

export async function generateMetadata({
  params
}: {
  params?: { locale?: string; slug?: string };
}): Promise<Metadata> {
  const locale = resolveStage2PilotLocaleFromParams(params);
  if (!locale) return METADATA_NOT_FOUND;
  const slug = decodeURIComponent(params?.slug ?? '').trim().toLowerCase();
  if (!slug || getStaticEssayGuide(slug)) {
    return localizedNotFoundMetadata(locale);
  }

  const resolved = await resolveLocalizedEssayGuidePage(
    slug,
    locale as ContentTranslationLocale
  );
  if (!resolved) {
    return localizedNotFoundMetadata(locale);
  }

  if (resolved.mode === 'englishFallback') {
    return buildEnglishFallbackPageMetadata({
      englishCanonicalPath: essayHubArticlePath(slug),
      title: resolved.copy.metaTitle,
      description: resolved.copy.metaDescription,
      openGraphLocale: locale === 'es' ? 'es_ES' : 'fr_FR'
    });
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
    resolved: {
      slug: resolved.slug,
      essay: resolved.essay,
      translation: resolved.translation,
      copy: resolved.copy
    }
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

  const resolved = await resolveLocalizedEssayGuidePage(
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
      mode={resolved.mode}
    />
  );
}
