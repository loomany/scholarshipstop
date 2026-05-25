import type { Metadata } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowRight } from 'lucide-react';

import CompareCardGrid from '@/components/compare/CompareCardGrid';
import { HubIqPromoAssessmentCard } from '@/components/i18n/HubIqPromoAssessmentCard';
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
import { getCompareHubUiCopy, type CompareHubUiCopy } from '@/lib/i18n/hubUiCopy';
import { getCompareHubIqPromoCopy } from '@/lib/i18n/hubIqPromoByHub';
import { getStaticCompareGuideCardCopy } from '@/lib/i18n/staticCompareGuideCards';
import {
  buildStaticCompareGuideEntries,
  filterStaticCompareGuides,
  isStaticCompareCategory,
  staticCompareCategoryCounts,
  type StaticCompareGuideEntry
} from '@/lib/i18n/staticCompareHub';
import {
  hrefForLocalizedUiRequired,
  sectionPathForLocale
} from '@/lib/i18n/localizedHref';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';

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


function CompareSubhubCategoryPromo({
  ui,
  hrefForPath,
  category
}: {
  ui: CompareHubUiCopy;
  hrefForPath: (path: string) => string;
  category: 'universities' | 'states';
}) {
  const path =
    category === 'universities' ? '/compare/universities' : '/compare/states';
  const title =
    category === 'universities'
      ? ui.toolbar.categoryUniversities
      : ui.toolbar.categoryStates;
  return (
    <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:mt-10">
      <h2 className="text-xl font-bold text-gray-950">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600">
        {ui.staticSubhubPromoBody}
      </p>
      <Link
        href={hrefForPath(path)}
        className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700"
      >
        {ui.staticSubhubPromoCta}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </section>
  );
}

function EvergreenCompareGuides({
  ui,
  hrefForPath,
  locale,
  guides
}: {
  ui: CompareHubUiCopy;
  hrefForPath: (path: string) => string;
  locale: Stage2PilotLocale | 'en';
  guides?: StaticCompareGuideEntry[];
}) {
  const slugs =
    guides?.map((g) => g.slug) ??
    STATIC_COMPARE_GUIDES.map((guide) => guide.slug);
  return (
    <section
      className="mt-8 rounded-3xl border border-orange-100 bg-orange-50/40 p-5 shadow-sm sm:mt-10 sm:p-6 lg:p-8"
      aria-labelledby="evergreen-compare-heading"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">
          {ui.evergreenEyebrow}
        </p>
        <h2
          id="evergreen-compare-heading"
          className="mt-2 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl"
        >
          {ui.evergreenTitle}
        </h2>
        <p className="mt-3 text-sm leading-7 text-gray-700 sm:text-base">
          {ui.evergreenBody}
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {slugs.map((slug) => {
          const card = getStaticCompareGuideCardCopy(locale, slug);
          return (
          <Link
            key={slug}
            href={hrefForPath(`/compare/${encodeURIComponent(slug)}`)}
            className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
          >
            <span className="w-fit rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
              {ui.evergreenBadge}
            </span>
            <h3 className="mt-3 line-clamp-2 text-base font-bold leading-snug text-gray-950">
              {card.title}
            </h3>
            <p className="mt-2 line-clamp-4 flex-1 text-sm leading-6 text-gray-600">
              {card.description}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 transition group-hover:text-orange-700">
              {ui.readComparison}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Link>
          );
        })}
      </div>
    </section>
  );
}

export type CompareIndexPageContentProps = {
  searchParams?: Record<string, string | string[] | undefined>;
  locale?: Stage2PilotLocale | 'en';
  ui?: CompareHubUiCopy;
};

export async function CompareIndexPageContent({
  searchParams,
  locale = 'en',
  ui: uiProp
}: CompareIndexPageContentProps) {
  const ui = uiProp ?? getCompareHubUiCopy(locale);
  const iqCopy = getCompareHubIqPromoCopy(locale);
  const sectionPath = sectionPathForLocale(locale, '/compare');
  const hrefForPath = (path: string) => hrefForLocalizedUiRequired(locale, path);
  const iqAssessmentHref = '/iq/assessment?intent=college_fit';
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
        sectionPath
      )
    );
  }

  const showingFrom =
    total === 0 ? 0 : (currentPage - 1) * COMPARE_INDEX_PAGE_SIZE + 1;
  const showingTo =
    total === 0 ? 0 : Math.min(currentPage * COMPARE_INDEX_PAGE_SIZE, total);
  const hasAnyPublished = allItems.length > 0;
  const staticEntries =
    locale !== 'en' ? buildStaticCompareGuideEntries(locale) : [];
  const staticFiltered =
    locale !== 'en'
      ? filterStaticCompareGuides(staticEntries, queryState)
      : [];
  const staticCategoryCounts =
    locale !== 'en'
      ? staticCompareCategoryCounts(staticEntries, queryState.q)
      : categoryCounts;
  const usePublishedCompareToolbar = hasAnyPublished;
  const showCompareToolbar =
    usePublishedCompareToolbar || staticEntries.length > 0;
  const staticToolbarResultCount = staticFiltered.length;
  const staticShowingFrom =
    staticToolbarResultCount === 0 ? 0 : 1;
  const staticShowingTo = staticToolbarResultCount;
  const toolbarCategoryCounts = usePublishedCompareToolbar
    ? categoryCounts
    : staticCategoryCounts;
  const toolbarResultCount = usePublishedCompareToolbar
    ? total
    : staticToolbarResultCount;
  const toolbarShowingFrom = usePublishedCompareToolbar
    ? showingFrom
    : staticShowingFrom;
  const toolbarShowingTo = usePublishedCompareToolbar
    ? showingTo
    : staticShowingTo;
  /** Battle pages are English DB content; keep canonical EN hrefs so cards work before per-locale compare copy ships. */
  const gridItems = slice;
  const showStaticSubhubPromo =
    locale !== 'en' &&
    queryState.category !== 'all' &&
    isStaticCompareCategory(queryState.category);

  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: ui.home,
        item: getURL(hrefForLocalizedUiRequired(locale, '/').replace(/^\/+/, '') || '/')
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: ui.breadcrumb,
        item: getURL(sectionPath.replace(/^\/+/, ''))
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
                href={hrefForPath('/')}
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                {ui.home}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li className="font-medium text-gray-900" aria-current="page">
              {ui.breadcrumb}
            </li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0">
            <header className="max-w-3xl">
              <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.1]">
                {ui.h1}
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed">
                {ui.intro}
              </p>
            </header>

            {showCompareToolbar ? (
              <Suspense
                fallback={
                  <div
                    className="mt-6 h-24 max-w-3xl animate-pulse rounded-2xl bg-gray-100"
                    aria-hidden
                  />
                }
              >
                <CompareIndexToolbarClient
                  categoryCounts={toolbarCategoryCounts}
                  resultCount={toolbarResultCount}
                  showingFrom={toolbarShowingFrom}
                  showingTo={toolbarShowingTo}
                  suggestionItems={
                    usePublishedCompareToolbar ? suggestionItems : []
                  }
                  basePath={sectionPath}
                  locale={locale}
                  compareToolbar={ui.toolbar}
                />
              </Suspense>
            ) : null}
          </div>

          <aside className="min-w-0 lg:pt-8" aria-label="Cognitive assessment">
            <HubIqPromoAssessmentCard
              href={iqAssessmentHref}
              iq={iqCopy}
            />
          </aside>
        </div>

        {showStaticSubhubPromo &&
        isStaticCompareCategory(queryState.category) ? (
          <CompareSubhubCategoryPromo
            ui={ui}
            hrefForPath={hrefForPath}
            category={queryState.category}
          />
        ) : (
          <EvergreenCompareGuides
            ui={ui}
            hrefForPath={hrefForPath}
            locale={locale}
            guides={locale !== 'en' ? staticFiltered : undefined}
          />
        )}

        {!hasAnyPublished ? (
          locale === 'en' ? (
            <p className="mt-12 text-center text-gray-600">{ui.noPublished}</p>
          ) : null
        ) : (
          <CompareCardGrid
            items={gridItems}
            emptyMessage={ui.noMatchesFilters}
            gridIq={ui.gridIq}
            iqHref={iqAssessmentHref}
            locale={locale}
          />
        )}

        {hasAnyPublished && slice.length > 0 ? (
          <>
            <div className="mt-6 lg:hidden">
              <HubIqPromoAssessmentCard
                href={iqAssessmentHref}
                iq={iqCopy}
              />
            </div>
            <ResourcesPagination
              locale={locale}
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
                  sectionPath
                )
              }
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
