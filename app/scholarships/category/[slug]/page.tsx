import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import {
  formatCategoryPageH1,
  normalizeCategoryId
} from '@/app/scholarships/scholarshipCategories';
import { categoryIsPromotedSeo } from '@/lib/scholarships/categorySeoAllowlist';
import {
  evaluateCategorySeoListingThin,
  seoThinCanonicalHref
} from '@/lib/scholarships/seoListingMetadataPolicy';
import { createClient } from '@/utils/supabase/server';
import {
  buildInitialListRequestKey,
  createInitialScholarshipsPayload,
  fetchInitialCategoryScholarshipsPayload
} from '@/app/scholarships/scholarshipListServerPayload';
import ScholarshipCategoryPageClient from '../ScholarshipCategoryPageClient';
import { getUserSubscriptionStatus } from '@/utils/supabase/queries';

type PageProps = { params: { slug: string } };

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
  const title = formatCategoryPageH1(id, lower);
  const description = `Browse ${title} — deadlines, award amounts, and eligibility.`;
  const meta: Metadata = {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: `/scholarships/category/${canonicalSlug}`
    }
  };
  const hasNonCanonicalQuery =
    Boolean(searchParams?.q) ||
    Boolean(searchParams?.category) ||
    Boolean(searchParams?.sort) ||
    Boolean(searchParams?.page) ||
    Boolean(searchParams?.deadline) ||
    Boolean(searchParams?.tab);
  if (hasNonCanonicalQuery) {
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

export default async function ScholarshipCategoryPage({ params }: PageProps) {
  const { canonicalSlug, pageTitle } = resolveCategorySlugParam(params.slug);
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const hasSubscription = user?.id
    ? await getUserSubscriptionStatus(supabase, user.id)
    : false;
  const initialListPayload = await fetchInitialCategoryScholarshipsPayload(
    supabase,
    canonicalSlug
  );
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: '/'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Find Scholarships',
        item: '/scholarships'
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: pageTitle,
        item: `/scholarships/category/${canonicalSlug}`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />
      <Suspense
        fallback={
          <section className="min-h-screen bg-[#F3F7FA] px-4 py-12 text-slate-600 sm:px-5 md:py-12 lg:px-8">
            <div className="mx-auto max-w-5xl">Loading scholarships…</div>
          </section>
        }
      >
        <ScholarshipCategoryPageClient
          categorySlug={canonicalSlug}
          pageTitle={pageTitle}
          isAuthenticated={Boolean(user)}
          hasSubscription={hasSubscription}
          initialPayload={createInitialScholarshipsPayload(
            buildInitialListRequestKey({
              kind: 'category',
              routeKey: canonicalSlug,
              searchParamsString: ''
            }),
            initialListPayload
          )}
        />
      </Suspense>
    </>
  );
}
