import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { EssaysIndexHeroMedia } from '@/components/essays/EssaysIndexHeroMedia';
import { EssaysIndexResultSummary } from '@/components/essays/EssaysIndexResultSummary';
import EssaysIndexToolbar from '@/components/essays/EssaysIndexToolbar';
import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
import {
  ESSAYS_INDEX_PAGE_SIZE,
  fetchAllPublishedEssaysForIndex,
  type EssayListFields
} from '@/lib/essays/essaysServer';
import {
  buildEssayCategoryToolbarOptions,
  buildEssaysIndexHref,
  essaysCategoryCountsAfterQuery,
  filterAndSortEssayIndexRows,
  paginateEssayIndex,
  parseEssaysIndexSearchParams
} from '@/lib/essays/essaysIndexFilters';
import {
  ESSAYS_PAGE_TITLE,
  ESSAYS_SECTION_PATH,
  essayHubArticlePath
} from '@/lib/essays/essayHubSection';
import { getURL } from '@/utils/helpers';

export const revalidate = 300;

const baseTitle = `${ESSAYS_PAGE_TITLE} — How to Write`;
const baseDescription =
  'Long-tail guides that teach you how to plan, draft, and revise scholarship essays—without replacing our scholarship directory pages.';

export function generateMetadata({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Metadata {
  const queryState = parseEssaysIndexSearchParams(searchParams);
  const hasNonCanonicalView =
    queryState.page > 1 ||
    queryState.q.length > 0 ||
    queryState.categoryKey != null ||
    queryState.sort !== 'latest';

  return {
    title: baseTitle,
    description: baseDescription,
    openGraph: { title: baseTitle, description: baseDescription },
    alternates: { canonical: ESSAYS_SECTION_PATH },
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

export default async function EssaysIndexPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const queryState = parseEssaysIndexSearchParams(searchParams);
  const allRows = await fetchAllPublishedEssaysForIndex();

  const categoryCounts = essaysCategoryCountsAfterQuery(allRows, queryState.q);
  const categoryOptions = buildEssayCategoryToolbarOptions(
    allRows,
    categoryCounts
  );

  const filtered = filterAndSortEssayIndexRows(allRows, queryState);
  const { slice, total, totalPages, currentPage } = paginateEssayIndex(
    filtered,
    queryState.page,
    ESSAYS_INDEX_PAGE_SIZE
  );

  if (total > 0 && queryState.page > totalPages) {
    redirect(
      buildEssaysIndexHref(
        totalPages,
        {
          q: queryState.q,
          categoryKey: queryState.categoryKey,
          sort: queryState.sort
        },
        ESSAYS_SECTION_PATH
      )
    );
  }

  const withSlug = slice.filter((p) => p.slug?.trim());
  const pageSize = ESSAYS_INDEX_PAGE_SIZE;
  const showingFrom =
    total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo =
    total === 0 ? 0 : Math.min(currentPage * pageSize, total);

  const hasAnyPublished = allRows.some((p) => p.slug?.trim());

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
        name: ESSAYS_PAGE_TITLE,
        item: getURL(ESSAYS_SECTION_PATH)
      }
    ]
  };

  const itemListSchema =
    withSlug.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: ESSAYS_PAGE_TITLE,
          description: baseDescription,
          numberOfItems: withSlug.length,
          itemListElement: withSlug.map((post, index) => {
            const slug = post.slug!.trim();
            const path = essayHubArticlePath(slug).replace(/^\/+/, '');
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
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-5 sm:px-6 sm:pb-12 sm:pt-6 lg:pb-14 lg:pt-6">
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
              {ESSAYS_PAGE_TITLE}
            </li>
          </ol>
        </nav>

        {hasAnyPublished ? (
          <Suspense
            fallback={
              <div
                className="mt-4 flex flex-col gap-6 sm:mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-x-8 lg:gap-y-0 xl:gap-x-10"
                aria-hidden
              >
                <div className="min-w-0 space-y-4">
                  <div className="h-28 w-full max-w-xl animate-pulse rounded-2xl bg-gray-100 sm:h-32" />
                  <div className="h-24 w-full animate-pulse rounded-2xl bg-gray-100" />
                </div>
                <div className="h-44 w-full max-w-sm shrink-0 animate-pulse rounded-2xl bg-gray-100 lg:mx-0 lg:max-w-none" />
              </div>
            }
          >
            {/*
              Title + toolbar share the left column with the video on the right (`lg`+).
              Stacking toolbar then a full-width `justify-end` video row left the left
              half of the row empty beside a tall video.
            */}
            <section className="mt-4 flex flex-col gap-6 sm:mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-x-8 lg:gap-y-0 xl:gap-x-10">
              <div className="min-w-0 space-y-4 sm:space-y-5">
                <header>
                  <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.1]">
                    {ESSAYS_PAGE_TITLE}
                  </h1>
                  <p className="mt-4 text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed">
                    How-to guides for scholarship essays—structured prompts,
                    outlines, and revision checklists. For browsing awards, use
                    the scholarship directory.
                  </p>
                </header>
                <EssaysIndexToolbar
                  categoryOptions={categoryOptions}
                  resultCount={total}
                  showingFrom={showingFrom}
                  showingTo={showingTo}
                  className="mt-0 w-full max-w-none"
                />
              </div>
              <aside className="w-full max-w-sm shrink-0 lg:max-w-none lg:w-full">
                <EssaysIndexHeroMedia
                  youtubeVideoId={
                    process.env.NEXT_PUBLIC_ESSAYS_HERO_YOUTUBE_ID?.trim() ||
                    null
                  }
                />
                <EssaysIndexResultSummary
                  resultCount={total}
                  showingFrom={showingFrom}
                  showingTo={showingTo}
                  className="mt-2 lg:hidden"
                />
              </aside>
            </section>
          </Suspense>
        ) : (
          <>
            <header className="mt-4 max-w-3xl sm:mt-5">
              <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.1]">
                {ESSAYS_PAGE_TITLE}
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed">
                How-to guides for scholarship essays—structured prompts, outlines,
                and revision checklists. For browsing awards, use the scholarship
                directory.
              </p>
            </header>
            <div className="mt-6 flex justify-center sm:mt-8 lg:justify-end">
              <div className="w-full max-w-[min(20rem,100%)] sm:max-w-sm">
                <EssaysIndexHeroMedia
                  youtubeVideoId={
                    process.env.NEXT_PUBLIC_ESSAYS_HERO_YOUTUBE_ID?.trim() || null
                  }
                />
              </div>
            </div>
          </>
        )}

        {!hasAnyPublished ? (
          <p className="mt-8 text-center text-gray-600 sm:mt-10">
            No published essay guides yet. Check back soon.
          </p>
        ) : total === 0 ? (
          <p className="mt-8 text-center text-gray-600 sm:mt-10">
            No guides match your filters. Try clearing search or categories.
          </p>
        ) : (
          <>
            <EssaysGrid posts={withSlug} />
            {total > 0 && withSlug.length > 0 ? (
              <ResourcesPagination
                currentPage={currentPage}
                totalPages={totalPages}
                buildHref={(page) =>
                  buildEssaysIndexHref(
                    page,
                    {
                      q: queryState.q,
                      categoryKey: queryState.categoryKey,
                      sort: queryState.sort
                    },
                    ESSAYS_SECTION_PATH
                  )
                }
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function EssaysGrid({ posts }: { posts: EssayListFields[] }) {
  return (
    <ul className="mt-6 grid list-none gap-6 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => {
        const slug = post.slug!.trim();
        const title = post.title?.trim() || 'Untitled';
        const desc = post.meta_description?.trim() || '';
        const href = essayHubArticlePath(slug);
        return (
          <li key={post.id}>
            <Link
              href={href}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] ring-1 ring-gray-100 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.16)]"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100">
                {post.hero_image_url?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.hero_image_url.trim()}
                    alt={title ? `Cover for ${title}` : 'Essay guide cover'}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-100 text-sm font-medium text-sky-700/80"
                    aria-hidden
                  >
                    Essay guide
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
                  Read guide →
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
