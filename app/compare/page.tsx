import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import CompareCardGrid from '@/components/compare/CompareCardGrid';
import CompareIndexToolbar from '@/components/compare/CompareIndexToolbar';
import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
import {
  buildCompareIndexHref,
  compareCategoryCountsAfterQuery,
  COMPARE_INDEX_PAGE_SIZE,
  filterAndSortCompareIndexItems,
  paginateCompareIndexItems,
  parseCompareIndexSearchParams,
} from '@/lib/seo/compareIndexFilters';
import { buildCombinedCompareItems } from '@/lib/seo/compareIndexData';
import { fetchRecentPublishedStateComparePages } from '@/lib/seo/stateCompareServer';
import { fetchRecentPublishedUniversityComparePages } from '@/lib/seo/universityCompareServer';
import { getURL } from '@/utils/helpers';

export const revalidate = 3600;

const baseTitle = 'Scholarship Comparisons';
const baseDescription =
  'Browse published state and university scholarship comparisons with searchable filters, categories, and fresh matchup cards.';

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

  return {
    title: `${baseTitle} | ScholarshipTop`,
    description: baseDescription,
    openGraph: {
      title: `${baseTitle} | ScholarshipTop`,
      description: baseDescription
    },
    alternates: { canonical: '/compare' },
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
    fetchRecentPublishedUniversityComparePages(120),
    fetchRecentPublishedStateComparePages(120)
  ]);

  const allItems = buildCombinedCompareItems({
    universities: universityBattles,
    states: stateWars
  });
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
    <div className="bg-white text-gray-900 antialiased">
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

        <header className="mt-8 max-w-3xl">
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
            <CompareIndexToolbar
              categoryCounts={categoryCounts}
              resultCount={total}
              showingFrom={showingFrom}
              showingTo={showingTo}
            />
          </Suspense>
        ) : null}

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
        ) : null}
      </div>
    </div>
  );
}
