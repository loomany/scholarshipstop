import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import ScholarshipCategoryPageAuthBridge from '@/app/scholarships/category/ScholarshipCategoryPageAuthBridge';
import LocalizedScholarshipCategoryPostListingSeo from '@/components/scholarships/LocalizedScholarshipCategoryPostListingSeo';
import {
  buildInitialListRequestKey,
  createInitialScholarshipsPayload,
  fetchInitialCategoryScholarshipsPayload
} from '@/app/scholarships/scholarshipListServerPayload';
import ScholarshipsHubShellSkeleton from '@/components/scholarships/ScholarshipsHubShellSkeleton';
import { isSeoNoiseQuery } from '@/app/scholarships/scholarshipSeoNoiseQuery';
import { buildScholarshipListingJsonLd } from '@/app/scholarships/scholarshipListingJsonLd';
import { buildCategoryPilotAlternates } from '@/lib/i18n/categoryPilot/categoryTranslationAlternates';
import {
  buildLocalizedCategoryPageCopy,
  fetchPublishedCategoryTranslation,
  resolveCategorySlugParam
} from '@/lib/i18n/categoryPilot/resolveLocalizedCategoryPage';
import { getContentTranslationSeoDecision } from '@/lib/i18n/contentTranslationsServer';
import { hrefForLocalizedUiRequired } from '@/lib/i18n/localizedHref';
import {
  METADATA_NOT_FOUND,
  resolveStage2PilotLocaleFromParams
} from '@/lib/i18n/metadataRouteParams';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { createPublicClient } from '@/utils/supabase/public';
import { getURL } from '@/utils/helpers';
import { getLocalizedCanonical } from '@/lib/seo/canonical';
import {
  DEFAULT_OPEN_GRAPH_IMAGES,
  DEFAULT_TWITTER_IMAGES
} from '@/lib/seo/socialImage';

export const revalidate = 300;

type PageProps = {
  params: { locale: string; slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

function toSearchParamsString(
  searchParams?: Record<string, string | string[] | undefined>
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      for (const part of value) {
        if (typeof part === 'string') qs.append(key, part);
      }
      continue;
    }
    if (typeof value === 'string') qs.set(key, value);
  }
  return qs.toString();
}

export async function generateMetadata({
  params,
  searchParams
}: {
  params?: { locale?: string; slug?: string };
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const locale = resolveStage2PilotLocaleFromParams(params);
  if (!locale) return METADATA_NOT_FOUND;
  const { canonicalSlug, categoryId, promoted } = resolveCategorySlugParam(
    params?.slug ?? ''
  );
  if (!promoted) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }

  const translation = await fetchPublishedCategoryTranslation(
    canonicalSlug,
    locale as ContentTranslationLocale
  );
  if (!translation) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }

  const copy = buildLocalizedCategoryPageCopy(
    translation,
    categoryId,
    canonicalSlug,
    locale
  );
  const englishIndexable = !isSeoNoiseQuery(searchParams);
  const seo = getContentTranslationSeoDecision({
    translation,
    englishIndexable,
    hasLocalizedTitle: Boolean(copy.pageTitle.trim()),
    hasLocalizedH1: Boolean(copy.pageTitle.trim()),
    hasLocalizedBody: Boolean(copy.introParagraph.trim())
  });

  const alternates = await buildCategoryPilotAlternates({
    canonicalSlug,
    currentLocale: locale
  });

  const title = translation.translated_meta_title?.trim() || copy.pageTitle;
  const description =
    translation.translated_meta_description?.trim() || copy.introParagraph;

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      locale: locale === 'es' ? 'es_ES' : 'fr_FR',
      images: DEFAULT_OPEN_GRAPH_IMAGES
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: DEFAULT_TWITTER_IMAGES
    },
    robots: seo.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true }
  };
}

export default async function LocalizedScholarshipCategoryPage({
  params,
  searchParams
}: PageProps) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const locale = params.locale as Stage2PilotLocale;

  const raw = decodeURIComponent(params.slug ?? '').trim();
  const { canonicalSlug, categoryId, promoted } = resolveCategorySlugParam(
    params.slug
  );
  if (!promoted) notFound();
  if (raw !== canonicalSlug) {
    permanentRedirect(
      hrefForLocalizedUiRequired(
        locale,
        `/scholarships/category/${canonicalSlug}`
      )
    );
  }

  const translation = await fetchPublishedCategoryTranslation(
    canonicalSlug,
    locale
  );
  if (!translation) notFound();

  const copy = buildLocalizedCategoryPageCopy(
    translation,
    categoryId,
    canonicalSlug,
    locale
  );

  const supabase = createPublicClient();
  const searchParamsString = toSearchParamsString(searchParams);
  const initialListPayload = await fetchInitialCategoryScholarshipsPayload(
    supabase,
    canonicalSlug,
    searchParamsString
  );

  const localizedCategoryPath = `/scholarships/category/${canonicalSlug}`;
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: locale === 'es' ? 'Inicio' : 'Accueil',
        item: getURL(hrefForLocalizedUiRequired(locale, '/'))
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: locale === 'es' ? 'Becas' : 'Bourses',
        item: getURL(hrefForLocalizedUiRequired(locale, '/scholarships'))
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: copy.pageTitle,
        item: getURL(getLocalizedCanonical(localizedCategoryPath, locale))
      }
    ]
  };

  const listingJsonLd =
    searchParamsString.length === 0
      ? buildScholarshipListingJsonLd({
          name: copy.pageTitle,
          description: copy.introParagraph,
          path: localizedCategoryPath,
          result: initialListPayload
        })
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />
      {listingJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd) }}
        />
      ) : null}
      <Suspense
        fallback={<ScholarshipsHubShellSkeleton pageTitle={copy.pageTitle} />}
      >
        <ScholarshipCategoryPageAuthBridge
          categorySlug={canonicalSlug}
          pageTitle={copy.pageTitle}
          introParagraph={copy.introParagraph}
          listingExploreHeading={copy.listingExploreHeading}
          listingExploreIntro={copy.listingExploreIntro}
          initialPayload={createInitialScholarshipsPayload(
            buildInitialListRequestKey({
              kind: 'category',
              routeKey: canonicalSlug,
              searchParamsString
            }),
            initialListPayload
          )}
        />
      </Suspense>
      <div className="bg-[#F3F7FA] px-4 pb-16 pt-8 sm:px-5 sm:pt-10 md:pb-20 lg:px-8">
        <LocalizedScholarshipCategoryPostListingSeo
          canonicalSlug={canonicalSlug}
          locale={locale}
          copy={copy.postListing}
        />
      </div>
    </>
  );
}
