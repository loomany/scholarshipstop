import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import CompareCardGrid from '@/components/compare/CompareCardGrid';
import { CompareHubExternalDataTeaser } from '@/components/compare/CompareHubExternalDataTeaser';
import CompareIqAssessmentCard from '@/components/compare/CompareIqAssessmentCard';
import CompareIndexToolbar from '@/components/compare/CompareIndexToolbar';
import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
import {
  buildCompareIndexHref,
  COMPARE_INDEX_PAGE_SIZE,
  filterAndSortCompareIndexItems,
  paginateCompareIndexItems,
  parseCompareIndexSearchParams
} from '@/lib/seo/compareIndexFilters';
import {
  buildCompareSuggestionSeedItems,
  buildStateCompareItems
} from '@/lib/seo/compareIndexData';
import { fetchAllPublishedStateComparePages } from '@/lib/seo/stateCompareServer';
import { getURL } from '@/utils/helpers';
import { getCompareSubhubUiCopy } from '@/lib/i18n/compareSubhubUiCopy';
import {
  hubGridContentPageSize,
  isIqSitePromoVisible
} from '@/lib/iq/iqSitePromoVisibility';
import {
  hrefForLocalizedUiRequired,
  type LocalizedUiLocale
} from '@/lib/i18n/localizedHref';

const EN_BASE_PATH = '/compare/states';
const baseTitle = 'State vs State';
const baseDescription =
  'Browse published state-vs-state scholarship comparisons with searchable cards and quick sorting.';

export type StateCompareHubPageBodyProps = {
  searchParams?: Record<string, string | string[] | undefined>;
  locale: LocalizedUiLocale;
};

export async function StateCompareHubPageBody({
  searchParams,
  locale
}: StateCompareHubPageBodyProps) {
  const ui = getCompareSubhubUiCopy('states', locale);
  const compareHref = hrefForLocalizedUiRequired(locale, '/compare');
  const homeHref = hrefForLocalizedUiRequired(locale, '/');
  const basePath = hrefForLocalizedUiRequired(locale, EN_BASE_PATH);
  const queryState = parseCompareIndexSearchParams(searchParams);
  const pages = await fetchAllPublishedStateComparePages();
  const items = buildStateCompareItems(pages);
  const suggestionItems = buildCompareSuggestionSeedItems(items);
  const filtered = filterAndSortCompareIndexItems(items, {
    q: queryState.q,
    category: 'all',
    sort: queryState.sort
  });
  const compareGridPageSize = hubGridContentPageSize(COMPARE_INDEX_PAGE_SIZE);
  const { slice, total, totalPages, currentPage } = paginateCompareIndexItems(
    filtered,
    queryState.page,
    compareGridPageSize
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
    total === 0 ? 0 : (currentPage - 1) * compareGridPageSize + 1;
  const showingTo =
    total === 0 ? 0 : Math.min(currentPage * compareGridPageSize, total);
  const hasAnyPublished = items.length > 0;
  const showIqPromo = isIqSitePromoVisible();

  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: ui.home,
        item: getURL(homeHref.replace(/^\/+/, '') || '/')
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: ui.compareBreadcrumb,
        item: getURL(compareHref.replace(/^\/+/, ''))
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: ui.h1,
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
                href={homeHref}
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                {ui.home}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li>
              <Link
                href={compareHref}
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                {ui.compareBreadcrumb}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li className="font-medium text-gray-900" aria-current="page">
              {ui.h1}
            </li>
          </ol>
        </nav>

        <div
          className={
            showIqPromo
              ? 'mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_400px]'
              : 'mt-8'
          }
        >
          <div className="min-w-0">
            <header className="max-w-3xl">
              <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.1]">
                {ui.h1}
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed">
                {ui.intro}
              </p>
            </header>

            <CompareHubExternalDataTeaser variant="states" />

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
                  fixedCategory="states"
                  searchPlaceholder={ui.searchPlaceholder}
                  resultLabel={ui.resultLabel}
                  suggestionItems={suggestionItems}
                  locale={locale}
                />
              </Suspense>
            ) : null}
          </div>

          {showIqPromo ? (
            <aside className="min-w-0 lg:pt-8" aria-label="Cognitive assessment">
              <CompareIqAssessmentCard variant="states" />
            </aside>
          ) : null}
        </div>

        {!hasAnyPublished ? (
          <p className="mt-12 text-center text-gray-600">{ui.emptyPublished}</p>
        ) : (
          <CompareCardGrid
            items={slice}
            emptyMessage={ui.emptyFilters}
            locale={locale}
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
