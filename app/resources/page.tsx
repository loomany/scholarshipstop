import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { ContentPostCardPublishedAt } from '@/components/content-hub/ContentPostCardPublishedAt';
import ResourcesIndexToolbar from '@/components/content-hub/ResourcesIndexToolbar';
import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
import {
  fetchAllPublishedContentPostsListFields,
  type ContentPostListFields
} from '@/lib/content-hub/contentPostsServer';
import {
  buildResourcesIndexHref,
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

export const dynamic = 'force-dynamic';

const baseTitle = `${RESOURCES_PAGE_TITLE} — Guides & Tips | ScholarshipTop`;
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

function ResourcesGrid({ posts }: { posts: ContentPostListFields[] }) {
  const withSlug = posts.filter((p) => p.slug?.trim());
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
        return (
          <li key={post.id}>
            <Link
              href={href}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] ring-1 ring-gray-100 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.16)]"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100">
                {post.cover_image_url?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.cover_image_url.trim()}
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
                <ContentPostCardPublishedAt publishedAt={post.published_at} />
                <h2 className="mt-2 text-lg font-bold leading-snug tracking-tight text-gray-900 group-hover:text-gray-800 sm:text-xl">
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
        item: '/'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: RESOURCES_PAGE_TITLE,
        item: RESOURCES_SECTION_PATH
      }
    ]
  };

  return (
    <div className="bg-white text-gray-900 antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />
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
          <ResourcesGrid posts={withSlug} />
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
