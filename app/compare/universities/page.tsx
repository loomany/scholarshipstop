import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import CompareCardGrid from '@/components/compare/CompareCardGrid';
import CompareIndexToolbar from '@/components/compare/CompareIndexToolbar';
import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
import {
  buildCompareIndexHref,
  COMPARE_INDEX_PAGE_SIZE,
  filterAndSortCompareIndexItems,
  paginateCompareIndexItems,
  parseCompareIndexSearchParams
} from '@/lib/seo/compareIndexFilters';
import { buildUniversityCompareItems } from '@/lib/seo/compareIndexData';
import { fetchRecentPublishedUniversityComparePages } from '@/lib/seo/universityCompareServer';
import { getURL } from '@/utils/helpers';

export const revalidate = 3600;

const basePath = '/compare/universities';
const baseTitle = 'University Battles';
const baseDescription =
  'Browse published university-vs-university scholarship comparisons with searchable cards and quick sorting.';

export function generateMetadata({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Metadata {
  const queryState = parseCompareIndexSearchParams(searchParams);
  const hasNonCanonicalView =
    queryState.page > 1 || queryState.q.length > 0 || queryState.sort !== 'latest';

  return {
    title: `${baseTitle} | ScholarshipTop`,
    description: baseDescription,
    openGraph: {
      title: `${baseTitle} | ScholarshipTop`,
      description: baseDescription
    },
    alternates: { canonical: basePath },
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

export default async function UniversityBattlesPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const queryState = parseCompareIndexSearchParams(searchParams);
  const pages = await fetchRecentPublishedUniversityComparePages(120);
  const items = buildUniversityCompareItems(pages);
  const filtered = filterAndSortCompareIndexItems(items, {
    q: queryState.q,
    category: 'all',
    sort: queryState.sort
  });
  const { slice, total, totalPages, currentPage } = paginateCompareIndexItems(
    filtered,
    queryState.page,
    COMPARE_INDEX_PAGE_SIZE
  );

  if (total > 0 && queryState.page > totalPages) {
    redirect(
      buildCompareIndexHref(
        totalPages,
        { q: queryState.q, category: 'all', sort: queryState.sort },
        basePath
      )
    );
  }

  const showingFrom =
    total === 0 ? 0 : (currentPage - 1) * COMPARE_INDEX_PAGE_SIZE + 1;
  const showingTo =
    total === 0 ? 0 : Math.min(currentPage * COMPARE_INDEX_PAGE_SIZE, total);
  const hasAnyPublished = items.length > 0;

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
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: baseTitle,
        item: getURL(basePath)
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
            <li>
              <Link
                href="/compare"
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                Compare
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li className="font-medium text-gray-900" aria-current="page">
              {baseTitle}
            </li>
          </ol>
        </nav>

        <header className="mt-8 max-w-3xl">
          <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.1]">
            {baseTitle}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed">
            Explore published university-vs-university scholarship comparisons and
            scan matchup cards faster with search and sorting.
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
              resultCount={total}
              showingFrom={showingFrom}
              showingTo={showingTo}
              basePath={basePath}
              showCategories={false}
              fixedCategory="universities"
              searchPlaceholder="Search university battles"
              resultLabel="university battles"
              suggestionItems={items}
            />
          </Suspense>
        ) : null}

        {!hasAnyPublished ? (
          <p className="mt-12 text-center text-gray-600">
            No published university battles yet. Check back soon.
          </p>
        ) : (
          <CompareCardGrid
            items={slice}
            emptyMessage="No university battles match your filters. Try clearing search."
          />
        )}

        {hasAnyPublished && slice.length > 0 ? (
          <ResourcesPagination
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={(page) =>
              buildCompareIndexHref(
                page,
                { q: queryState.q, category: 'all', sort: queryState.sort },
                basePath
              )
            }
          />
        ) : null}
      </div>
    </div>
  );
}
