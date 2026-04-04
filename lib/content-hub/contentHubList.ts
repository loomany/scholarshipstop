import type { ContentHubArticle } from '@/lib/content-hub/types';
import type { ContentHubChip } from '@/lib/content-hub/categories';
import { CONTENT_HUB_CHIPS } from '@/lib/content-hub/categories';

export const CONTENT_HUB_PAGE_SIZE = 12;

const VALID_CATEGORY_IDS = new Set(
  CONTENT_HUB_CHIPS.filter((c) => c.id !== 'all').map((c) => c.id)
);

function firstString(
  v: string | string[] | undefined
): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export function parseContentHubCategoryParam(
  raw: string | undefined
): ContentHubChip['id'] {
  if (!raw || !VALID_CATEGORY_IDS.has(raw as ContentHubChip['id'])) {
    return 'all';
  }
  return raw as ContentHubChip['id'];
}

export function parseContentHubPageParam(raw: string | undefined): number {
  const n = parseInt(raw ?? '1', 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export type ContentHubListQuery = {
  page: number;
  q: string;
  category: ContentHubChip['id'];
};

export function parseContentHubListQuery(searchParams: {
  page?: string | string[];
  q?: string | string[];
  category?: string | string[];
}): ContentHubListQuery {
  return {
    page: parseContentHubPageParam(firstString(searchParams.page)),
    q: (firstString(searchParams.q) ?? '').trim(),
    category: parseContentHubCategoryParam(firstString(searchParams.category))
  };
}

export function matchesContentHubSearch(
  article: ContentHubArticle,
  q: string
): boolean {
  if (!q.trim()) return true;
  const n = q.trim().toLowerCase();
  return (
    article.title.toLowerCase().includes(n) ||
    article.excerpt.toLowerCase().includes(n)
  );
}

export function filterContentHubArticles(
  articles: ContentHubArticle[],
  q: string,
  categoryId: ContentHubChip['id']
): ContentHubArticle[] {
  return articles.filter((a) => {
    if (categoryId !== 'all' && a.category !== categoryId) return false;
    return matchesContentHubSearch(a, q);
  });
}

export type ContentHubPageResult = {
  items: ContentHubArticle[];
  total: number;
  totalPages: number;
  page: number;
  /** If set, caller should redirect to this query string (includes leading ? or empty). */
  redirectQuery: string | null;
};

export function getContentHubPageResult(
  articles: ContentHubArticle[],
  query: ContentHubListQuery
): ContentHubPageResult {
  const filtered = filterContentHubArticles(
    articles,
    query.q,
    query.category
  );
  const total = filtered.length;
  const totalPages =
    total === 0 ? 0 : Math.ceil(total / CONTENT_HUB_PAGE_SIZE);

  let page = query.page;
  if (totalPages > 0 && page > totalPages) {
    page = totalPages;
  }
  if (page < 1) page = 1;

  const redirectQuery =
    totalPages > 0 && page !== query.page
      ? buildContentHubListQueryString({ ...query, page })
      : null;

  const offset = (page - 1) * CONTENT_HUB_PAGE_SIZE;
  const items = filtered.slice(offset, offset + CONTENT_HUB_PAGE_SIZE);

  return { items, total, totalPages, page, redirectQuery };
}

export type ContentHubQueryBuild = {
  page?: number;
  q?: string;
  category?: ContentHubChip['id'];
};

/**
 * Build query string for /resources links. Omits default page (1), empty q, category=all.
 */
export function buildContentHubListQueryString(opts: ContentHubQueryBuild): string {
  const p = new URLSearchParams();
  const q = opts.q?.trim() ?? '';
  if (q) p.set('q', q);
  if (opts.category && opts.category !== 'all') {
    p.set('category', opts.category);
  }
  const page = opts.page ?? 1;
  if (page > 1) p.set('page', String(page));
  const s = p.toString();
  return s ? `?${s}` : '';
}
