'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { useRouter } from 'next/navigation';

import type { ContentHubArticle } from '@/lib/content-hub/types';
import {
  CONTENT_HUB_CHIPS,
  type ContentHubChip
} from '@/lib/content-hub/categories';
import { buildContentHubListQueryString } from '@/lib/content-hub/contentHubList';
import { RESOURCES_SECTION_PATH } from '@/lib/content-hub/resourcesSection';
import ContentHubHero from '@/components/content-hub/ContentHubHero';
import ContentHubSearch from '@/components/content-hub/ContentHubSearch';
import ContentHubCategoryChips from '@/components/content-hub/ContentHubCategoryChips';
import ContentHubArticleCard from '@/components/content-hub/ContentHubArticleCard';
import ContentHubPagination from '@/components/content-hub/ContentHubPagination';

const SEARCH_DEBOUNCE_MS = 350;

type ContentHubListingProps = {
  pageArticles: ContentHubArticle[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  q: string;
  category: ContentHubChip['id'];
  children?: ReactNode;
};

export default function ContentHubListing({
  pageArticles,
  totalCount,
  currentPage,
  totalPages,
  q,
  category,
  children
}: ContentHubListingProps) {
  const router = useRouter();
  const [draftQ, setDraftQ] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraftQ(q);
  }, [q]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const pushList = useCallback(
    (opts: { q: string; category: ContentHubChip['id']; page: number }) => {
      const qs = buildContentHubListQueryString(opts);
      router.push(`${RESOURCES_SECTION_PATH}${qs}`);
    },
    [router]
  );

  const onSearchChange = (value: string) => {
    setDraftQ(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      pushList({ q: value, category, page: 1 });
    }, SEARCH_DEBOUNCE_MS);
  };

  const onCategoryChange = (id: ContentHubChip['id']) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    pushList({ q: draftQ, category: id, page: 1 });
  };

  const buildPageHref = useCallback(
    (page: number) =>
      `${RESOURCES_SECTION_PATH}${buildContentHubListQueryString({ page, q, category })}`,
    [q, category]
  );

  return (
    <>
      {children}
      <section
        aria-label="Resources introduction"
        className="mt-6 sm:mt-8"
      >
        <ContentHubHero />
        <ContentHubSearch value={draftQ} onChange={onSearchChange} />
        <ContentHubCategoryChips
          chips={CONTENT_HUB_CHIPS}
          activeId={category}
          onChange={onCategoryChange}
        />
      </section>

      <div className="mt-6 sm:mt-7">
        {totalCount === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white/80 px-6 py-12 text-center text-gray-600">
            No articles match your filters. Try another category or clear the
            search.
          </p>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {pageArticles.map((article) => (
                <li key={article.slug} className="min-w-0">
                  <ContentHubArticleCard article={article} />
                </li>
              ))}
            </ul>
            <ContentHubPagination
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={buildPageHref}
            />
          </>
        )}
      </div>
    </>
  );
}
