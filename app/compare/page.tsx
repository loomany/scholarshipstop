import type { Metadata } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowRight, BrainCircuit } from 'lucide-react';

import CompareCardGrid from '@/components/compare/CompareCardGrid';
import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
import {
  buildCompareIndexHref,
  compareCategoryCountsAfterQuery,
  COMPARE_INDEX_PAGE_SIZE,
  filterAndSortCompareIndexItems,
  paginateCompareIndexItems,
  parseCompareIndexSearchParams,
} from '@/lib/seo/compareIndexFilters';
import {
  buildCombinedCompareItems,
  buildCompareSuggestionSeedItems
} from '@/lib/seo/compareIndexData';
import { STATIC_COMPARE_GUIDES } from '@/lib/compare/staticCompareGuides';
import { fetchAllPublishedStateComparePages } from '@/lib/seo/stateCompareServer';
import { fetchAllPublishedUniversityComparePages } from '@/lib/seo/universityCompareServer';
import { getURL } from '@/utils/helpers';
import { getCanonical } from '@/lib/seo/canonical';

export const revalidate = 3600;

const baseTitle = 'Scholarship Comparisons';
const baseDescription =
  'Compare scholarships, grants, award types, state scholarship markets, and university scholarship matchups with practical decision guides.';

const CompareIndexToolbarClient = dynamic(
  () => import('@/components/compare/CompareIndexToolbar'),
  {
    ssr: false,
    loading: () => (
      <div
        className="mt-6 h-24 max-w-3xl animate-pulse rounded-2xl bg-gray-100"
        aria-hidden
      />
    )
  }
);

function CompareIqAssessmentCard() {
  return (
    <Link
      href="/iq/assessment?intent=college_fit"
      aria-label="Start IQ assessment"
      className="group relative block overflow-hidden rounded-3xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-5 text-left shadow-[0_18px_45px_-30px_rgba(234,88,12,0.58)] ring-1 ring-[#FFE2C2] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-34px_rgba(234,88,12,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 lg:min-h-[13.25rem]"
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#FF7A1A] via-slate-950 to-[#0EA5E9]"
        aria-hidden
      />
      <div
        className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[#FF7A1A]/16 blur-3xl"
        aria-hidden
      />
      <div className="relative flex h-full min-w-0 flex-col justify-between pl-1">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFB875] bg-white/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#B45309] shadow-sm">
              <BrainCircuit className="h-3 w-3 text-[#F97316]" aria-hidden />
              Featured Tool
            </span>
            <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
              IQ
            </span>
          </div>
          <p className="text-xl font-semibold leading-snug tracking-tight text-slate-950">
            Compare schools. Understand yourself first.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            See how your logic, speed, and pattern recognition shape the way you
            evaluate scholarship options.
          </p>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-orange-100 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Assessment
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-950 transition group-hover:text-[#B45309]">
            Start IQ test
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

function EvergreenCompareGuides() {
  return (
    <section
      className="mt-8 rounded-3xl border border-orange-100 bg-orange-50/40 p-5 shadow-sm sm:mt-10 sm:p-6 lg:p-8"
      aria-labelledby="evergreen-compare-heading"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">
          Compare scholarship types
        </p>
        <h2
          id="evergreen-compare-heading"
          className="mt-2 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl"
        >
          Start with evergreen decisions before comparing matchups
        </h2>
        <p className="mt-3 text-sm leading-7 text-gray-700 sm:text-base">
          These guides explain common scholarship choices in plain English:
          grant versus scholarship, merit versus need, no-essay versus essay,
          and local versus national opportunities.
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATIC_COMPARE_GUIDES.map((guide) => (
          <Link
            key={guide.slug}
            href={`/compare/${encodeURIComponent(guide.slug)}`}
            className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
          >
            <span className="w-fit rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
              Evergreen guide
            </span>
            <h3 className="mt-3 line-clamp-2 text-base font-bold leading-snug text-gray-950">
              {guide.h1}
            </h3>
            <p className="mt-2 line-clamp-4 flex-1 text-sm leading-6 text-gray-600">
              {guide.shortAnswer}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 transition group-hover:text-orange-700">
              Read comparison
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function generateMetadata({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Metadata {
  const queryState = parseCompareIndexSearchParams(searchParams);
  const hasNonCanonicalView =
    queryState.page > 1 ||
    queryState.q.length > 0 ||
    queryState.category !== 'all' ||
    queryState.sort !== 'latest';
  const canonical = getCanonical('/compare');

  return {
    title: 'Compare Scholarships, Grants, and Award Types',
    description: baseDescription,
    openGraph: {
      title: 'Compare Scholarships, Grants, and Award Types | ScholarshipTop',
      description: baseDescription,
      url: canonical
    },
    alternates: { canonical },
    ...(hasNonCanonicalView
      ? {
          robots: {
            index: false,
            follow: true
          }
        }
      : {})
  };
}

export default async function CompareHubPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const queryState = parseCompareIndexSearchParams(searchParams);

  const [universityBattles, stateWars] = await Promise.all([
    fetchAllPublishedUniversityComparePages(),
    fetchAllPublishedStateComparePages()
  ]);

  const allItems = buildCombinedCompareItems({
    universities: universityBattles,
    states: stateWars
  });
  const suggestionItems = buildCompareSuggestionSeedItems(allItems);
  const categoryCounts = compareCategoryCountsAfterQuery(allItems, queryState.q);
  const filtered = filterAndSortCompareIndexItems(allItems, queryState);
  const { slice, total, totalPages, currentPage } = paginateCompareIndexItems(
    filtered,
    queryState.page,
    COMPARE_INDEX_PAGE_SIZE
  );

  if (total > 0 && queryState.page > totalPages) {
    redirect(
      buildCompareIndexHref(
        totalPages,
        {
          q: queryState.q,
          category: queryState.category,
          sort: queryState.sort
        },
        '/compare'
      )
    );
  }

  const showingFrom =
    total === 0 ? 0 : (currentPage - 1) * COMPARE_INDEX_PAGE_SIZE + 1;
  const showingTo =
    total === 0 ? 0 : Math.min(currentPage * COMPARE_INDEX_PAGE_SIZE, total);
  const hasAnyPublished = allItems.length > 0;

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
        name: 'Compare',
        item: getURL('/compare')
      }
    ]
  };

  const itemListSchema =
    slice.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: baseTitle,
          description: baseDescription,
          numberOfItems: slice.length,
          itemListElement: slice.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.title,
            item: getURL(item.href.replace(/^\/+/, ''))
          }))
        }
      : null;

  return (
    <div className="bg-white font-sans text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />
      {itemListSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
      ) : null}

      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
        <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li>
              <Link
                href="/"
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                Home
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li className="font-medium text-gray-900" aria-current="page">
              Compare
            </li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0">
            <header className="max-w-3xl">
              <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.1]">
                Scholarship Comparisons
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed">
                Explore published state and university matchups, compare funding
                environments, and jump into the strongest scholarship markets faster.
              </p>
            </header>

            {hasAnyPublished ? (
              <Suspense
                fallback={
                  <div
                    className="mt-6 h-24 max-w-3xl animate-pulse rounded-2xl bg-gray-100"
                    aria-hidden
                  />
                }
              >
                <CompareIndexToolbarClient
                  categoryCounts={categoryCounts}
                  resultCount={total}
                  showingFrom={showingFrom}
                  showingTo={showingTo}
                  suggestionItems={suggestionItems}
                />
              </Suspense>
            ) : null}
          </div>

          <aside className="min-w-0 lg:pt-8" aria-label="Cognitive assessment">
            <CompareIqAssessmentCard />
          </aside>
        </div>

        <EvergreenCompareGuides />

        {!hasAnyPublished ? (
          <p className="mt-12 text-center text-gray-600">
            No published comparisons yet. Check back soon.
          </p>
        ) : (
          <CompareCardGrid
            items={slice}
            emptyMessage="No comparisons match your filters. Try clearing search or categories."
          />
        )}

        {hasAnyPublished && slice.length > 0 ? (
          <>
            <div className="mt-6 lg:hidden">
              <CompareIqAssessmentCard />
            </div>
            <ResourcesPagination
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={(page) =>
                buildCompareIndexHref(
                  page,
                  {
                    q: queryState.q,
                    category: queryState.category,
                    sort: queryState.sort
                  },
                  '/compare'
                )
              }
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
