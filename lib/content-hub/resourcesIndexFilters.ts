import type { ContentPostListFields } from '@/lib/content-hub/contentPostsServer';
import {
  classifyResourceArticle,
  isResourceCategoryId,
  parseResourceSubIdsParam,
  postMatchesResourceQuery,
  RESOURCE_CATEGORY_ORDER,
  type ResourceArticleClassification,
  type ResourceCategoryId
} from '@/lib/content-hub/resourceTaxonomy';
export type ResourceIndexSort = 'latest' | 'oldest';

export type ResourcesIndexQueryState = {
  q: string;
  categoryId: ResourceCategoryId | null;
  subcategoryIds: Set<string>;
  sort: ResourceIndexSort;
  page: number;
};

export type ClassifiedResourcePost = {
  post: ContentPostListFields;
  classification: ResourceArticleClassification | null;
};

function parsePageParam(
  raw: string | string[] | undefined
): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(String(s ?? '1'), 10);
  return Number.isNaN(n) || n < 1 ? 1 : n;
}

function parseSortParam(
  raw: string | string[] | undefined
): ResourceIndexSort {
  const s = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
  return s === 'oldest' ? 'oldest' : 'latest';
}

export function parseResourcesIndexSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined
): ResourcesIndexQueryState {
  const q = String(
    Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q ?? ''
  ).trim();

  const catRaw = Array.isArray(searchParams?.cat)
    ? searchParams?.cat[0]
    : searchParams?.cat;
  const categoryId = isResourceCategoryId(catRaw) ? catRaw : null;

  const subRaw = Array.isArray(searchParams?.sub)
    ? searchParams?.sub[0]
    : searchParams?.sub;
  const subcategoryIds = parseResourceSubIdsParam(subRaw, categoryId);

  const sort = parseSortParam(searchParams?.sort);
  const page = parsePageParam(searchParams?.page);

  return { q, categoryId, subcategoryIds, sort, page };
}

export function classifyResourcePosts(
  posts: ContentPostListFields[]
): ClassifiedResourcePost[] {
  return posts.map((post) => ({
    post,
    classification: classifyResourceArticle(post)
  }));
}

function passesCategoryFilters(
  row: ClassifiedResourcePost,
  categoryId: ResourceCategoryId | null,
  subcategoryIds: Set<string>
): boolean {
  if (!categoryId) return true;
  const c = row.classification;
  if (!c || c.categoryId !== categoryId) return false;
  if (subcategoryIds.size === 0) return true;
  return subcategoryIds.has(c.subcategoryId);
}

export function filterAndSortResourcePosts(
  rows: ClassifiedResourcePost[],
  state: Pick<
    ResourcesIndexQueryState,
    'q' | 'categoryId' | 'subcategoryIds' | 'sort'
  >
): ContentPostListFields[] {
  const { q, categoryId, subcategoryIds, sort } = state;

  let filtered = rows.filter((row) =>
    postMatchesResourceQuery(row.post, q, row.classification)
  );
  filtered = filtered.filter((row) =>
    passesCategoryFilters(row, categoryId, subcategoryIds)
  );

  const mult = sort === 'oldest' ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    const ta = a.post.published_at
      ? new Date(a.post.published_at).getTime()
      : 0;
    const tb = b.post.published_at
      ? new Date(b.post.published_at).getTime()
      : 0;
    if (ta !== tb) return (ta - tb) * mult;
    return a.post.id.localeCompare(b.post.id);
  });

  return sorted.map((r) => r.post);
}

export function paginateResources<T>(
  items: T[],
  page: number,
  pageSize: number
): { slice: T[]; total: number; totalPages: number; currentPage: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = (currentPage - 1) * pageSize;
  const slice = items.slice(from, from + pageSize);
  return { slice, total, totalPages, currentPage };
}

export function resourcesCategoryCountsAfterQuery(
  rows: ClassifiedResourcePost[],
  q: string
): Record<ResourceCategoryId, number> {
  const base = {} as Record<ResourceCategoryId, number>;
  for (const id of RESOURCE_CATEGORY_ORDER) base[id] = 0;

  for (const row of rows) {
    if (!postMatchesResourceQuery(row.post, q, row.classification)) continue;
    if (row.classification) {
      base[row.classification.categoryId] =
        (base[row.classification.categoryId] ?? 0) + 1;
    }
  }
  return base;
}

export function buildResourcesIndexHref(
  page: number,
  state: Pick<
    ResourcesIndexQueryState,
    'q' | 'categoryId' | 'subcategoryIds' | 'sort'
  >,
  basePath: string
): string {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set('q', state.q.trim());
  if (state.categoryId) params.set('cat', state.categoryId);
  if (state.subcategoryIds.size > 0) {
    params.set('sub', [...state.subcategoryIds].sort().join(','));
  }
  if (state.sort !== 'latest') params.set('sort', state.sort);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
