import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LocalizedProductionPage } from '@/components/i18n/LocalizedProductionPage';
import LocalizedResourceArticlePage from '@/components/content-hub/LocalizedResourceArticlePage';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { getContentTranslationSeoDecision } from '@/lib/i18n/contentTranslationsServer';
import { buildResourcePilotAlternates } from '@/lib/i18n/resourcePilot/resourceTranslationAlternates';
import {
  buildLocalizedResourcePageCopy,
  fetchPublishedResourceTranslation,
  getStaticLocalizedResourcePilotPage
} from '@/lib/i18n/resourcePilot/resolveLocalizedResourcePage';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';

export const revalidate = 300;
export const dynamicParams = true;

type PageProps = {
  params: { locale: string; slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!isStage2PilotLocale(params.locale)) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }
  const locale = params.locale as Stage2PilotLocale;
  const slug = decodeURIComponent(params.slug).trim().toLowerCase();

  const staticPage = getStaticLocalizedResourcePilotPage(locale, slug);
  if (staticPage) {
    return { title: staticPage.title };
  }

  const resolved = await fetchPublishedResourceTranslation(
    slug,
    locale as ContentTranslationLocale
  );
  if (!resolved) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }

  const copy = buildLocalizedResourcePageCopy(
    resolved.translation,
    locale as ContentTranslationLocale
  );
  const seo = getContentTranslationSeoDecision({
    translation: resolved.translation,
    englishIndexable: true,
    hasLocalizedTitle: Boolean(copy.title.trim()),
    hasLocalizedH1: Boolean(copy.title.trim()),
    hasLocalizedBody: Boolean(copy.bodyHtml.trim())
  });

  const alternates = await buildResourcePilotAlternates({
    slug,
    currentLocale: locale
  });

  const title = copy.metaTitle;
  const description = copy.metaDescription || copy.summary;

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
    robots: seo.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true }
  };
}

export default async function LocalizedResourceArticleRoute({ params }: PageProps) {
  if (!isStage2PilotLocale(params.locale)) {
    notFound();
  }
  const locale = params.locale as Stage2PilotLocale;
  const slug = decodeURIComponent(params.slug).trim().toLowerCase();

  const staticPage = getStaticLocalizedResourcePilotPage(locale, slug);
  if (staticPage) {
    return <LocalizedProductionPage page={staticPage} />;
  }

  const resolved = await fetchPublishedResourceTranslation(
    slug,
    locale as ContentTranslationLocale
  );
  if (!resolved) {
    notFound();
  }

  const copy = buildLocalizedResourcePageCopy(
    resolved.translation,
    locale as ContentTranslationLocale
  );

  return (
    <LocalizedResourceArticlePage
      locale={locale}
      slug={slug}
      post={resolved.post}
      copy={copy}
    />
  );
}
