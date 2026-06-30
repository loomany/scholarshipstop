import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import ScholarshipCategoryPostListingSeo from '@/components/scholarships/ScholarshipCategoryPostListingSeo';
import {
  categoryListingAvailableHeading,
  categoryListingAvailableIntro,
  categoryListingIntroParagraph,
  categoryListingMetaDescription,
  categoryListingMetaTitle
} from '@/app/scholarships/category/categoryListingSeoCopy';
import { resolveCategoryExpertContent } from '@/app/scholarships/category/categoryExpertContent';
import {
  formatCategoryPageH1,
  normalizeCategoryId
} from '@/app/scholarships/scholarshipCategories';
import { isLongTailSlug } from '@/app/scholarships/scholarshipLongTailPresets';
import { categoryIsPromotedSeo } from '@/lib/scholarships/categorySeoAllowlist';
import {
  evaluateCategorySeoListingThin,
  seoThinCanonicalHref
} from '@/lib/scholarships/seoListingMetadataPolicy';
import {
  buildInitialListRequestKey,
  createInitialScholarshipsPayload,
  fetchInitialCategoryScholarshipsPayload
} from '@/app/scholarships/scholarshipListServerPayload';
import ScholarshipsHubShellSkeleton from '@/components/scholarships/ScholarshipsHubShellSkeleton';
import ScholarshipCategoryPageAuthBridge from '../ScholarshipCategoryPageAuthBridge';
import { createPublicClient } from '@/utils/supabase/public';
import { getURL } from '@/utils/helpers';
import { isSeoNoiseQuery } from '@/app/scholarships/scholarshipSeoNoiseQuery';
import { buildScholarshipListingJsonLd } from '@/app/scholarships/scholarshipListingJsonLd';
import { buildCategoryPilotAlternates } from '@/lib/i18n/categoryPilot/categoryTranslationAlternates';
import { fetchPublishedCategoryTranslation } from '@/lib/i18n/categoryPilot/resolveLocalizedCategoryPage';
import { getCanonical } from '@/lib/seo/canonical';
import {
  DEFAULT_OPEN_GRAPH_IMAGES,
  DEFAULT_TWITTER_IMAGES
} from '@/lib/seo/socialImage';

export const revalidate = 300;

type PageProps = { params: { slug: string } };

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

function resolveCategorySlugParam(slug: string): {
  canonicalSlug: string;
  pageTitle: string;
} {
  const raw = decodeURIComponent(slug ?? '').trim();
  if (!raw) notFound();
  const lower = raw.toLowerCase();
  const canonical = normalizeCategoryId(lower);
  if (!canonical && isLongTailSlug(lower)) {
    permanentRedirect(`/scholarships/${lower}`);
  }
  const canonicalSlug = canonical ?? lower;
  if (raw !== canonicalSlug) {
    permanentRedirect(`/scholarships/category/${canonicalSlug}`);
  }
  return {
    canonicalSlug,
    pageTitle: formatCategoryPageH1(canonical, lower)
  };
}

export async function generateMetadata({
  params,
  searchParams
}: PageProps & {
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const raw = decodeURIComponent(params.slug ?? '').trim();
  const lower = raw.toLowerCase();
  const id = normalizeCategoryId(lower);
  const canonicalSlug = id ?? lower;
  const title = categoryListingMetaTitle(id, lower);
  const description = categoryListingMetaDescription(id, lower);
  const canonical = getCanonical(`/scholarships/category/${canonicalSlug}`);
  const hasEs = Boolean(
    await fetchPublishedCategoryTranslation(canonicalSlug, 'es')
  );
  const hasFr = Boolean(
    await fetchPublishedCategoryTranslation(canonicalSlug, 'fr')
  );
  const alternates =
    hasEs || hasFr
      ? await buildCategoryPilotAlternates({
          canonicalSlug,
          currentLocale: 'en'
        })
      : { canonical };

  const meta: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonical,
      images: DEFAULT_OPEN_GRAPH_IMAGES
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: DEFAULT_TWITTER_IMAGES
    },
    alternates
  };
  if (isSeoNoiseQuery(searchParams)) {
    meta.robots = { index: false, follow: true };
    return meta;
  }
  if (!categoryIsPromotedSeo(canonicalSlug)) {
    meta.robots = { index: false, follow: true };
    return meta;
  }
  try {
    const live = await evaluateCategorySeoListingThin(canonicalSlug);
    if (live.thinListing || live.broadFallbackNoindex) {
      meta.robots = { index: false, follow: true };
      const thinCanonical = getCanonical(
        seoThinCanonicalHref({
          kind: 'category',
          canonicalPath: canonicalSlug
        })
      );
      meta.alternates = {
        canonical: thinCanonical
      };
      meta.openGraph = {
        title,
        description,
        url: thinCanonical,
        images: DEFAULT_OPEN_GRAPH_IMAGES
      };
    }
  } catch {
    /* ignore */
  }
  return meta;
}

export default async function ScholarshipCategoryPage({
  params,
  searchParams
}: PageProps & {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { canonicalSlug, pageTitle } = resolveCategorySlugParam(params.slug);
  const categoryId = normalizeCategoryId(canonicalSlug.toLowerCase());
  const expertContent = resolveCategoryExpertContent(categoryId);
  const introParagraph =
    expertContent?.intro ??
    categoryListingIntroParagraph(canonicalSlug, categoryId);
  const listingExploreHeading = categoryListingAvailableHeading(
    categoryId,
    canonicalSlug
  );
  const listingExploreIntro = categoryListingAvailableIntro(
    categoryId,
    canonicalSlug
  );
  const supabase = createPublicClient();
  const searchParamsString = toSearchParamsString(searchParams);
  const initialListPayload = await fetchInitialCategoryScholarshipsPayload(
    supabase,
    canonicalSlug,
    searchParamsString
  );
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: getURL('/')
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Find Scholarships',
        item: getURL('/scholarships')
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: pageTitle,
        item: getURL(`/scholarships/category/${canonicalSlug}`)
      }
    ]
  };
  const listingJsonLd =
    searchParamsString.length === 0
      ? buildScholarshipListingJsonLd({
          name: pageTitle,
          description: introParagraph,
          path: `/scholarships/category/${canonicalSlug}`,
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
        fallback={<ScholarshipsHubShellSkeleton pageTitle={pageTitle} />}
      >
        <ScholarshipCategoryPageAuthBridge
          categorySlug={canonicalSlug}
          pageTitle={pageTitle}
          introParagraph={introParagraph}
          listingExploreHeading={listingExploreHeading}
          listingExploreIntro={listingExploreIntro}
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
      {/*
        SSR FAQ + related cards must stay outside the client boundary — passing them as
        children/props through nested Client Components can drop Server Component output in production.
      */}
      <div className="bg-[#F3F7FA] px-4 pb-16 pt-8 sm:px-5 sm:pt-10 md:pb-20 lg:px-8">
        <ScholarshipCategoryPostListingSeo
          canonicalSlug={canonicalSlug}
          categoryId={categoryId}
        />
      </div>
    </>
  );
}
