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
  params
}: PageProps): Promise<Metadata> {
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
  const initialListPayload = await fetchInitialCategoryScholarshipsPayload(
    supabase,
    canonicalSlug
  );

  return (
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
  );
}
