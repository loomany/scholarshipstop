import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

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
import { ScholarshipsBrandLoading } from '@/components/scholarships/ScholarshipsBrandLoading';
import ScholarshipCategoryPageAuthBridge from '../ScholarshipCategoryPageAuthBridge';
import { createPublicClient } from '@/utils/supabase/public';
import { getURL } from '@/utils/helpers';
import { isSeoNoiseQuery } from '@/app/scholarships/scholarshipSeoNoiseQuery';
import { buildScholarshipListingJsonLd } from '@/app/scholarships/scholarshipListingJsonLd';

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
  const canonicalSlug = canonical ?? lower;
  if (raw !== canonicalSlug) {
    redirect(`/scholarships/category/${canonicalSlug}`);
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
  const meta: Metadata = {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: `/scholarships/category/${canonicalSlug}`
    }
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
      meta.alternates = {
        canonical: seoThinCanonicalHref({
          kind: 'category',
          canonicalPath: canonicalSlug
        })
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
    expertContent?.intro ?? categoryListingIntroParagraph(canonicalSlug, categoryId);
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
        fallback={
          <section className="min-h-screen bg-[#F3F7FA] px-4 py-12 sm:px-5 md:py-12 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <ScholarshipsBrandLoading showTopAccentBar />
            </div>
          </section>
        }
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
