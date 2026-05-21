import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Fragment, Suspense } from 'react';
import { ArrowRight, BrainCircuit } from 'lucide-react';

import ResourcesIndexToolbar from '@/components/content-hub/ResourcesIndexToolbar';
import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
import {
  fetchAllPublishedContentPostsListFields,
  type ContentPostListFields
} from '@/lib/content-hub/contentPostsServer';
import { fetchLatestPublishedEssayHubList } from '@/lib/essays/essaysServer';
import {
  buildResourcesIndexHref,
  type ClassifiedResourcePost,
  classifyResourcePosts,
  filterAndSortResourcePosts,
  paginateResources,
  parseResourcesIndexSearchParams,
  resourcesCategoryCountsAfterQuery
} from '@/lib/content-hub/resourcesIndexFilters';
import {
  RESOURCES_INDEX_PAGE_SIZE,
  RESOURCES_PAGE_TITLE,
  RESOURCES_SECTION_PATH,
  resourcesArticlePath
} from '@/lib/content-hub/resourcesSection';
import { getURL } from '@/utils/helpers';
import { getCanonical } from '@/lib/seo/canonical';
import { STATIC_SCHOLARSHIP_GUIDES } from '@/lib/resources/staticScholarshipGuides';
import {
  getHubIqPromoUiCopy,
  getResourcesHubUiCopy,
  type ResourcesHubUiCopy
} from '@/lib/i18n/hubUiCopy';
import { getStaticResourceGuideCardCopy } from '@/lib/i18n/staticResourceGuideCards';
import {
  hrefForLocalizedUiRequired,
  sectionPathForLocale
} from '@/lib/i18n/localizedHref';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';
import {
  buildStaticResourceGuideEntries,
  filterStaticResourceGuides
} from '@/lib/i18n/staticResourceHub';
import {
  RESOURCE_CATEGORY_ORDER,
  type ResourceCategoryId
} from '@/lib/content-hub/resourceTaxonomy';
import { listPublishedResourceArticleTranslations } from '@/lib/i18n/resourcePilot/listPublishedResourceArticleTranslations';

const MIN_TRANSLATED_RESOURCES_FOR_LOCALE_GRID = 10;

const baseTitle = `${RESOURCES_PAGE_TITLE} — Guides & Tips`;
const baseDescription =
  'Guides and expert tips to help you find scholarships, write stronger applications, and stay organized.';

function ResourcesIqAssessmentCard({
  iq
}: {
  iq: ReturnType<typeof getHubIqPromoUiCopy>;
}) {
  return (
    <Link
      href="/iq/assessment?intent=scholarship_match"
      aria-label={iq.startIqAria}
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
              {iq.featuredTool}
            </span>
            <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
              {iq.iqBadge}
            </span>
          </div>
          <p className="text-xl font-semibold leading-snug tracking-tight text-slate-950">
            {iq.buildSmarterStrategy}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {iq.buildSmarterStrategyBody}
          </p>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-orange-100 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {iq.assessment}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-950 transition group-hover:text-[#B45309]">
            {iq.startIqTest}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

function StaticScholarshipGuidesSection({
  ui,
  hrefForPath,
  locale,
  guideSlugs
}: {
  ui: ResourcesHubUiCopy;
  hrefForPath: (path: string) => string;
  locale: Stage2PilotLocale | 'en';
  guideSlugs?: string[];
}) {
  const featured = STATIC_SCHOLARSHIP_GUIDES.filter(
    (guide) => !guideSlugs || guideSlugs.includes(guide.slug)
  ).slice(0, 6);
  return (
    <section
      className="mt-10 rounded-3xl border border-gray-200 bg-gray-50/80 p-5 sm:p-6"
      aria-labelledby="static-scholarship-guides-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
            {ui.staticGuidesEyebrow}
          </p>
          <h2
            id="static-scholarship-guides-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-gray-950"
          >
            {ui.staticGuidesTitle}
          </h2>
        </div>
        <Link
          href={hrefForPath('/scholarship-scam-warning')}
          className="text-sm font-semibold text-orange-700 underline-offset-4 hover:underline"
        >
          {ui.scamWarning}
        </Link>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {featured.map((guide) => {
          const card = getStaticResourceGuideCardCopy(locale, guide.slug);
          return (
          <Link
            key={guide.slug}
            href={hrefForPath(resourcesArticlePath(guide.slug))}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2"
          >
            <span className="text-sm font-semibold text-gray-950">
              {card.title}
            </span>
            <span className="mt-2 block text-xs leading-5 text-gray-600">
              {card.description}
            </span>
          </Link>
          );
        })}
      </div>
    </section>
  );
}

function buildResourceFallbackCovers(
  rows: ClassifiedResourcePost[],
  preferredGlobalCovers: string[] = []
): Map<string, string> {
  const bySubcategory = new Map<string, string[]>();
  const byCategory = new Map<string, string[]>();
  const global: string[] = [];
  const seenGlobal = new Set<string>();

  for (const row of rows) {
    const cover = row.post.cover_image_url?.trim();
    const c = row.classification;
    if (!cover || !c) continue;

    const subKey = `${c.categoryId}::${c.subcategoryId}`;
    const subList = bySubcategory.get(subKey) ?? [];
    if (!subList.includes(cover)) subList.push(cover);
    bySubcategory.set(subKey, subList);

    const categoryList = byCategory.get(c.categoryId) ?? [];
    if (!categoryList.includes(cover)) categoryList.push(cover);
    byCategory.set(c.categoryId, categoryList);

    if (!seenGlobal.has(cover)) {
      seenGlobal.add(cover);
      global.push(cover);
    }
  }

  const prioritizedGlobal = [...preferredGlobalCovers, ...global].filter(
    (value, index, arr) => arr.indexOf(value) === index
  );

  const fallbackByPostId = new Map<string, string>();
  const nextIndexByPool = new Map<string, number>();
  const pickFromPool = (poolKey: string, pool: string[]): string | undefined => {
    if (pool.length === 0) return undefined;
    const idx = nextIndexByPool.get(poolKey) ?? 0;
    const cover = pool[idx % pool.length];
    nextIndexByPool.set(poolKey, idx + 1);
    return cover;
  };

  for (const row of rows) {
    if (row.post.cover_image_url?.trim()) continue;
    const c = row.classification;
    if (!c) {
      const globalCover = pickFromPool('global', prioritizedGlobal);
      if (globalCover) fallbackByPostId.set(row.post.id, globalCover);
      continue;
    }

    const subKey = `${c.categoryId}::${c.subcategoryId}`;
    const fallback =
      pickFromPool(`sub:${subKey}`, bySubcategory.get(subKey) ?? []) ??
      pickFromPool(`cat:${c.categoryId}`, byCategory.get(c.categoryId) ?? []) ??
      pickFromPool('global', prioritizedGlobal);
    if (fallback) fallbackByPostId.set(row.post.id, fallback);
  }

  return fallbackByPostId;
}

function resolveCoverSrc(
  post: ContentPostListFields,
  fallbackCoverByPostId: Map<string, string>
): string | null {
  return post.cover_image_url?.trim() ?? fallbackCoverByPostId.get(post.id) ?? null;
}

function resolveCoverDedupeKey(
  post: ContentPostListFields,
  fallbackCoverByPostId: Map<string, string>
): string | null {
  return (
    post.cover_image_source_url?.trim() ??
    post.cover_image_url?.trim() ??
    fallbackCoverByPostId.get(post.id) ??
    null
  );
}

function rebalanceAdjacentDuplicateCovers(
  posts: ContentPostListFields[],
  fallbackCoverByPostId: Map<string, string>
): ContentPostListFields[] {
  const out = [...posts];
  for (let i = 1; i < out.length; i += 1) {
    const prevCover = resolveCoverDedupeKey(out[i - 1], fallbackCoverByPostId);
    const currentCover = resolveCoverDedupeKey(out[i], fallbackCoverByPostId);
    if (!prevCover || !currentCover || prevCover !== currentCover) continue;

    let swapIdx = -1;
    for (let j = i + 1; j < out.length; j += 1) {
      const candidateCover = resolveCoverDedupeKey(out[j], fallbackCoverByPostId);
      if (!candidateCover || candidateCover === prevCover) continue;
      const beforeOk =
        i - 1 < 0 ||
        resolveCoverDedupeKey(out[i - 1], fallbackCoverByPostId) !==
          candidateCover;
      const afterOk =
        i + 1 >= out.length ||
        resolveCoverDedupeKey(out[i + 1], fallbackCoverByPostId) !==
          candidateCover;
      if (beforeOk && afterOk) {
        swapIdx = j;
        break;
      }
    }
    if (swapIdx !== -1) {
      const tmp = out[i];
      out[i] = out[swapIdx];
      out[swapIdx] = tmp;
    }
  }
  return out;
}

function ResourcesGridIqAssessmentCard({
  iq
}: {
  iq: ReturnType<typeof getHubIqPromoUiCopy>;
}) {
  return (
    <li>
      <Link
        href="/iq/assessment?intent=scholarship_match"
        aria-label={iq.startIqAria}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#FFB875]/80 bg-white text-left shadow-[0_12px_40px_-18px_rgba(234,88,12,0.58)] ring-1 ring-[#FFE2C2] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-18px_rgba(234,88,12,0.74)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF]">
          <div
            className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#FF7A1A] via-slate-950 to-[#0EA5E9]"
            aria-hidden
          />
          <div
            className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#FF7A1A]/18 blur-3xl"
            aria-hidden
          />
          <div
            className="absolute bottom-2 right-10 h-24 w-24 rounded-full bg-sky-300/25 blur-2xl"
            aria-hidden
          />
          <div className="relative flex h-full flex-col justify-between p-5 pl-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFB875] bg-white/85 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#B45309] shadow-sm">
                <BrainCircuit className="h-3 w-3 text-[#F97316]" aria-hidden />
                {iq.featuredTool}
              </span>
              <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                {iq.strategyFit}
              </span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_5rem] items-end gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {iq.assessment}
                </p>
                <p className="mt-1 text-lg font-bold leading-tight tracking-tight text-slate-950">
                  {iq.findBestNextMove}
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/75 p-2 shadow-sm backdrop-blur">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-1.5 py-1">
                    <p className="text-[8px] font-medium text-slate-500">IQ</p>
                    <p className="mt-0.5 text-xs font-bold leading-none text-slate-950">
                      --
                    </p>
                  </div>
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-1.5 py-1">
                    <p className="text-[8px] font-medium text-slate-500">Type</p>
                    <p className="mt-0.5 text-xs font-bold leading-none text-slate-950">
                      ???
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <article className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFB875] bg-white/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#B45309] shadow-sm">
              <BrainCircuit className="h-3 w-3 text-[#F97316]" aria-hidden />
              {iq.personalized}
            </span>
          </div>
          <h2 className="mt-3 text-lg font-bold leading-snug tracking-tight text-slate-950 sm:text-xl">
            {iq.notSureWhatToRead}
          </h2>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
            {iq.notSureWhatToReadBody}
          </p>
          <span className="mt-4 inline-flex items-center text-sm font-semibold text-orange-600 transition group-hover:text-orange-700">
            {iq.startIqTest}
            <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
          </span>
        </article>
      </Link>
    </li>
  );
}

function ResourcesGrid({
  posts,
  fallbackCoverByPostId,
  hrefForPath,
  iq
}: {
  posts: ContentPostListFields[];
  fallbackCoverByPostId: Map<string, string>;
  hrefForPath: (path: string) => string;
  iq: ReturnType<typeof getHubIqPromoUiCopy>;
}) {
  const withSlug = rebalanceAdjacentDuplicateCovers(
    posts.filter((p) => p.slug?.trim()),
    fallbackCoverByPostId
  );
  if (withSlug.length === 0) {
    return (
      <p className="mt-12 text-center text-gray-600">
        No guides match your filters. Try clearing search or categories.
      </p>
    );
  }
  return (
    <ul className="mt-6 grid list-none gap-6 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
      {withSlug.map((post, index) => {
        const slug = post.slug!.trim();
        const title = post.title?.trim() || 'Untitled';
        const desc = post.meta_description?.trim() || '';
        const href = hrefForPath(resourcesArticlePath(slug));
        const coverSrc = resolveCoverSrc(post, fallbackCoverByPostId);
        return (
          <Fragment key={post.id}>
            <li>
              <Link
                href={href}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] ring-1 ring-gray-100 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.16)]"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100">
                  {coverSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverSrc}
                      alt={
                        post.title?.trim()
                          ? `Cover image for ${post.title.trim()}`
                          : 'Article cover image'
                      }
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-sm font-medium text-gray-400"
                      aria-hidden
                    >
                      No image
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <h2 className="text-lg font-bold leading-snug tracking-tight text-gray-900 group-hover:text-gray-800 sm:text-xl">
                    {title}
                  </h2>
                  {desc ? (
                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">
                      {desc}
                    </p>
                  ) : null}
                  <span className="mt-4 inline-flex items-center text-sm font-semibold text-orange-600 group-hover:text-orange-700">
                    Read more →
                  </span>
                </div>
              </Link>
            </li>
            {index === 2 ? <ResourcesGridIqAssessmentCard iq={iq} /> : null}
          </Fragment>
        );
      })}
    </ul>
  );
}

export type ResourcesIndexPageContentProps = {
  searchParams?: Record<string, string | string[] | undefined>;
  locale?: Stage2PilotLocale | 'en';
  ui?: ResourcesHubUiCopy;
};

export async function ResourcesIndexPageContent({
  searchParams,
  locale = 'en',
  ui: uiProp
}: ResourcesIndexPageContentProps) {
  const ui = uiProp ?? getResourcesHubUiCopy(locale);
  const iqCopy = getHubIqPromoUiCopy(locale);
  const sectionPath = sectionPathForLocale(locale, RESOURCES_SECTION_PATH);
  const hrefForPath = (path: string) => hrefForLocalizedUiRequired(locale, path);
  const queryState = parseResourcesIndexSearchParams(searchParams);
  const [allPosts, latestEssays, resourceTranslationSummaries] =
    await Promise.all([
      fetchAllPublishedContentPostsListFields(),
      fetchLatestPublishedEssayHubList(240),
      locale !== 'en'
        ? listPublishedResourceArticleTranslations()
        : Promise.resolve([])
    ]);

  const translatedIdsForLocale = new Set(
    resourceTranslationSummaries
      .filter((row) => row.locale === locale)
      .map((row) => row.sourceId)
  );
  const translatedResourceCount = resourceTranslationSummaries.filter(
    (row) => row.locale === locale
  ).length;

  const postsForLocale =
    locale === 'en'
      ? allPosts
      : allPosts.filter((post) => translatedIdsForLocale.has(post.id));

  const showLocaleDbGrid =
    locale === 'en' ||
    translatedResourceCount >= MIN_TRANSLATED_RESOURCES_FOR_LOCALE_GRID;

  const classified = classifyResourcePosts(postsForLocale);
  const essayCovers = latestEssays
    .map((essay) => essay.hero_image_url?.trim() ?? '')
    .filter(Boolean);
  const fallbackCoverByPostId = buildResourceFallbackCovers(
    classified,
    essayCovers
  );
  const categoryCounts = resourcesCategoryCountsAfterQuery(
    classified,
    queryState.q
  );

  const filtered = filterAndSortResourcePosts(classified, queryState);
  const { slice, total, totalPages, currentPage } = paginateResources(
    filtered,
    queryState.page,
    RESOURCES_INDEX_PAGE_SIZE
  );

  if (total > 0 && queryState.page > totalPages) {
    redirect(
      buildResourcesIndexHref(
        totalPages,
        {
          q: queryState.q,
          categoryId: queryState.categoryId,
          subcategoryIds: queryState.subcategoryIds,
          sort: queryState.sort
        },
        sectionPath
      )
    );
  }

  const withSlug = slice.filter((p) => p.slug?.trim());
  const pageSize = RESOURCES_INDEX_PAGE_SIZE;
  const showingFrom =
    total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo =
    total === 0 ? 0 : Math.min(currentPage * pageSize, total);

  const hasAnyPublished = postsForLocale.some((p) => p.slug?.trim());
  const staticEntries =
    locale !== 'en' ? buildStaticResourceGuideEntries(locale) : [];
  const staticFiltered =
    locale !== 'en'
      ? filterStaticResourceGuides(staticEntries, queryState)
      : [];
  const staticGuideSlugs = staticFiltered.map((entry) => entry.slug);
  const showStaticResourcesToolbar =
    locale !== 'en' && !showLocaleDbGrid && staticEntries.length > 0;
  const emptyStaticCategoryCounts = RESOURCE_CATEGORY_ORDER.reduce(
    (acc, id) => {
      acc[id] = 0;
      return acc;
    },
    {} as Record<ResourceCategoryId, number>
  );
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: ui.home,
        item: getURL(hrefForPath('/').replace(/^\/+/, '') || '/')
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: ui.h1,
        item: getURL(sectionPath.replace(/^\/+/, ''))
      }
    ]
  };

  const staticGuideItemListElements = STATIC_SCHOLARSHIP_GUIDES.map(
    (guide, index) => {
      const card = getStaticResourceGuideCardCopy(locale, guide.slug);
      return {
        '@type': 'ListItem',
        position: withSlug.length + index + 1,
        name: card.title,
        item: getURL(resourcesArticlePath(guide.slug).replace(/^\/+/, ''))
      };
    }
  );

  const itemListSchema =
    withSlug.length > 0 || staticGuideItemListElements.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: RESOURCES_PAGE_TITLE,
          description: baseDescription,
          numberOfItems: withSlug.length + staticGuideItemListElements.length,
          itemListElement: [
            ...withSlug.map((post, index) => {
              const slug = post.slug!.trim();
              const path = resourcesArticlePath(slug).replace(/^\/+/, '');
              return {
                '@type': 'ListItem',
                position: index + 1,
                name: post.title?.trim() || 'Untitled',
                item: getURL(path)
              };
            }),
            ...staticGuideItemListElements
          ]
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
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(itemListSchema)
          }}
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
              {ui.h1}
            </li>
          </ol>
        </nav>

        {/*
          ES/FR: show DB grid only for content_posts with published resource_article
          translations (Stage 4D pilot). Untranslated English CMS cards stay hidden.
        */}
        {locale === 'en' || showLocaleDbGrid ? (
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

              {hasAnyPublished ? (
                <Suspense
                  fallback={
                    <div
                      className="mt-6 h-24 max-w-3xl animate-pulse rounded-2xl bg-gray-100"
                      aria-hidden
                    />
                  }
                >
                  <ResourcesIndexToolbar
                    locale={locale}
                    categoryCounts={categoryCounts}
                    resultCount={total}
                    showingFrom={showingFrom}
                    showingTo={showingTo}
                  />
                </Suspense>
              ) : null}
            </div>

            <aside className="min-w-0 lg:pt-8" aria-label="Cognitive assessment">
              <ResourcesIqAssessmentCard iq={iqCopy} />
            </aside>
          </div>
        ) : (
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
              {showStaticResourcesToolbar ? (
                <Suspense
                  fallback={
                    <div
                      className="mt-6 h-24 max-w-3xl animate-pulse rounded-2xl bg-gray-100"
                      aria-hidden
                    />
                  }
                >
                  <ResourcesIndexToolbar
                    locale={locale}
                    categoryCounts={emptyStaticCategoryCounts}
                    resultCount={staticFiltered.length}
                    showingFrom={staticFiltered.length === 0 ? 0 : 1}
                    showingTo={staticFiltered.length}
                  />
                </Suspense>
              ) : null}
            </div>
            <aside className="min-w-0 lg:pt-8" aria-label="Cognitive assessment">
              <ResourcesIqAssessmentCard iq={iqCopy} />
            </aside>
          </div>
        )}

        <StaticScholarshipGuidesSection
          ui={ui}
          hrefForPath={hrefForPath}
          locale={locale}
          guideSlugs={
            locale !== 'en' && !showLocaleDbGrid ? staticGuideSlugs : undefined
          }
        />

        {locale === 'en' || showLocaleDbGrid ? (
          !hasAnyPublished ? (
            <p className="mt-12 text-center text-gray-600">
              {ui.noPublished}
            </p>
          ) : (
            <>
              {locale !== 'en' && ui.translatedDbTitle ? (
                <header className="mt-12 max-w-3xl">
                  <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
                    {ui.translatedDbEyebrow}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                    {ui.translatedDbTitle}
                  </h2>
                </header>
              ) : null}
              <ResourcesGrid
                posts={withSlug}
                fallbackCoverByPostId={fallbackCoverByPostId}
                hrefForPath={hrefForPath}
                iq={iqCopy}
              />
            </>
          )
        ) : null}

        {(locale === 'en' || showLocaleDbGrid) && hasAnyPublished && withSlug.length > 0 ? (
          <>
            <div className="mt-6 lg:hidden">
              <ResourcesIqAssessmentCard iq={iqCopy} />
            </div>
            <ResourcesPagination
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={(page) =>
                buildResourcesIndexHref(
                  page,
                  {
                    q: queryState.q,
                    categoryId: queryState.categoryId,
                    subcategoryIds: queryState.subcategoryIds,
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
