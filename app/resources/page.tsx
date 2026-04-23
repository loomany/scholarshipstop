import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

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

export const revalidate = 300;

const baseTitle = `${RESOURCES_PAGE_TITLE} — Guides & Tips`;
const baseDescription =
  'Guides and expert tips to help you find scholarships, write stronger applications, and stay organized.';

export function generateMetadata({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Metadata {
  const queryState = parseResourcesIndexSearchParams(searchParams);
  const hasNonCanonicalView =
    queryState.page > 1 ||
    queryState.q.length > 0 ||
    queryState.categoryId != null ||
    queryState.subcategoryIds.size > 0 ||
    queryState.sort !== 'latest';

  return {
    title: baseTitle,
    description: baseDescription,
    openGraph: { title: baseTitle, description: baseDescription },
    alternates: { canonical: RESOURCES_SECTION_PATH },
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

function rebalanceAdjacentDuplicateCovers(
  posts: ContentPostListFields[],
  fallbackCoverByPostId: Map<string, string>
): ContentPostListFields[] {
  const out = [...posts];
  for (let i = 1; i < out.length; i += 1) {
    const prevCover = resolveCoverSrc(out[i - 1], fallbackCoverByPostId);
    const currentCover = resolveCoverSrc(out[i], fallbackCoverByPostId);
    if (!prevCover || !currentCover || prevCover !== currentCover) continue;

    let swapIdx = -1;
    for (let j = i + 1; j < out.length; j += 1) {
      const candidateCover = resolveCoverSrc(out[j], fallbackCoverByPostId);
      if (!candidateCover || candidateCover === prevCover) continue;
      const beforeOk =
        i - 1 < 0 ||
        resolveCoverSrc(out[i - 1], fallbackCoverByPostId) !== candidateCover;
      const afterOk =
        i + 1 >= out.length ||
        resolveCoverSrc(out[i + 1], fallbackCoverByPostId) !== candidateCover;
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

function ResourcesGrid({
  posts,
  fallbackCoverByPostId
}: {
  posts: ContentPostListFields[];
  fallbackCoverByPostId: Map<string, string>;
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
      {withSlug.map((post) => {
        const slug = post.slug!.trim();
        const title = post.title?.trim() || 'Untitled';
        const desc = post.meta_description?.trim() || '';
        const href = resourcesArticlePath(slug);
        const coverSrc = resolveCoverSrc(post, fallbackCoverByPostId);
        return (
          <li key={post.id}>
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
        );
      })}
    </ul>
  );
}

export default async function ResourcesIndexPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const queryState = parseResourcesIndexSearchParams(searchParams);
  const allPosts = await fetchAllPublishedContentPostsListFields();
  const classified = classifyResourcePosts(allPosts);
  const essayCovers = (
    await fetchLatestPublishedEssayHubList(240)
  )
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
        RESOURCES_SECTION_PATH
      )
    );
  }

  const withSlug = slice.filter((p) => p.slug?.trim());
  const pageSize = RESOURCES_INDEX_PAGE_SIZE;
  const showingFrom =
    total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo =
    total === 0 ? 0 : Math.min(currentPage * pageSize, total);

  const hasAnyPublished = allPosts.some((p) => p.slug?.trim());
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
        name: RESOURCES_PAGE_TITLE,
        item: getURL(RESOURCES_SECTION_PATH)
      }
    ]
  };

  const itemListSchema =
    withSlug.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: RESOURCES_PAGE_TITLE,
          description: baseDescription,
          numberOfItems: withSlug.length,
          itemListElement: withSlug.map((post, index) => {
            const slug = post.slug!.trim();
            const path = resourcesArticlePath(slug).replace(/^\/+/, '');
            return {
              '@type': 'ListItem',
              position: index + 1,
              name: post.title?.trim() || 'Untitled',
              item: getURL(path)
            };
          })
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
              {RESOURCES_PAGE_TITLE}
            </li>
          </ol>
        </nav>

        <header className="mt-8 max-w-3xl">
          <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.1]">
            {RESOURCES_PAGE_TITLE}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed">
            Guides and expert tips to help you find scholarships and apply with
            confidence.
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
              categoryCounts={categoryCounts}
              resultCount={total}
              showingFrom={showingFrom}
              showingTo={showingTo}
            />
          </Suspense>
        ) : null}

        {!hasAnyPublished ? (
          <p className="mt-12 text-center text-gray-600">
            No published articles yet. Check back soon.
          </p>
        ) : (
          <ResourcesGrid
            posts={withSlug}
            fallbackCoverByPostId={fallbackCoverByPostId}
          />
        )}

        {hasAnyPublished && withSlug.length > 0 ? (
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
                RESOURCES_SECTION_PATH
              )
            }
          />
        ) : null}
      </div>
    </div>
  );
}
