import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LocalizedProductionPage } from '@/components/i18n/LocalizedProductionPage';
import LocalizedResourceArticlePage from '@/components/content-hub/LocalizedResourceArticlePage';
import { classifyResourceArticle } from '@/lib/content-hub/resourceTaxonomy';
import { getRelatedScholarshipsForResourceArticle } from '@/lib/content-hub/relatedScholarshipsForResourceArticle';
import {
  filterActiveHubScholarships,
  filterActiveRelatedScholarshipItems,
  shouldShowResourceArticleIqCta
} from '@/lib/content-hub/filterResourceArticleRelatedScholarships';
import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { getContentTranslationSeoDecision } from '@/lib/i18n/contentTranslationsServer';
import { buildEnglishFallbackPageMetadata } from '@/lib/i18n/localizedContentFallbackMetadata';
import { buildResourcePilotAlternates } from '@/lib/i18n/resourcePilot/resourceTranslationAlternates';
import {
  buildLocalizedResourcePageCopy,
  getStaticLocalizedResourcePilotPage,
  resolveLocalizedResourceArticlePage
} from '@/lib/i18n/resourcePilot/resolveLocalizedResourcePage';
import { buildLocalizedPilotMetadata } from '@/lib/i18n/localizedMetadata';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';
import { fetchScholarshipsBySlugsOrIdsOrdered } from '@/lib/scholarships/supabase';

export const revalidate = 300;
export const dynamicParams = true;

type PageProps = {
  params: { locale: string; slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export async function generateMetadata({
  params,
  searchParams
}: PageProps): Promise<Metadata> {
  if (!isStage2PilotLocale(params.locale)) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }
  const locale = params.locale as Stage2PilotLocale;
  const slug = decodeURIComponent(params.slug).trim().toLowerCase();

  const staticPage = getStaticLocalizedResourcePilotPage(locale, slug);
  if (staticPage) {
    return buildLocalizedPilotMetadata({ page: staticPage, searchParams });
  }

  const resolved = await resolveLocalizedResourceArticlePage(
    slug,
    locale as ContentTranslationLocale
  );
  if (!resolved) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }

  if (resolved.mode === 'englishFallback') {
    const copy = resolved.copy;
    return buildEnglishFallbackPageMetadata({
      englishCanonicalPath: resourcesArticlePath(slug),
      title: copy.metaTitle,
      description: copy.metaDescription || copy.summary,
      openGraphLocale: locale === 'es' ? 'es_ES' : 'fr_FR'
    });
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

  const resolved = await resolveLocalizedResourceArticlePage(
    slug,
    locale as ContentTranslationLocale
  );
  if (!resolved) {
    notFound();
  }

  const copy = resolved.copy;

  const resourceClassification = classifyResourceArticle(resolved.post);
  const showResourceIqCta = shouldShowResourceArticleIqCta(
    resourceClassification,
    slug
  );
  const matchedRelatedScholarships = filterActiveRelatedScholarshipItems(
    await getRelatedScholarshipsForResourceArticle(resolved.post)
  );
  const hubScholarshipKeys = matchedRelatedScholarships.map((r) => r.slug.trim());
  const hubScholarships = filterActiveHubScholarships(
    hubScholarshipKeys.length > 0
      ? await fetchScholarshipsBySlugsOrIdsOrdered(hubScholarshipKeys)
      : []
  );

  return (
    <LocalizedResourceArticlePage
      locale={locale}
      slug={slug}
      post={resolved.post}
      copy={copy}
      mode={resolved.mode}
      matchedRelatedScholarships={matchedRelatedScholarships}
      hubScholarships={hubScholarships}
      showResourceIqCta={showResourceIqCta}
    />
  );
}
