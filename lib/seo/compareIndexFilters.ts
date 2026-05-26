export const COMPARE_INDEX_PAGE_SIZE = 11;

export type CompareIndexCategory = 'all' | 'universities' | 'states';
export type CompareIndexSort = 'latest' | 'title';

export type CompareIndexQueryState = {
  q: string;
  category: CompareIndexCategory;
  sort: CompareIndexSort;
  page: number;
};

export type CompareIndexItem = {
  id: string;
  type: Exclude<CompareIndexCategory, 'all'>;
  slug: string;
  title: string;
  description: string;
  href: string;
  updatedAt: string | null;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function hasNonEmptySearchParamValue(
  value: string | string[] | undefined
): boolean {
  if (Array.isArray(value)) {
    return value.some((part) => typeof part === 'string' && part.trim().length > 0);
  }
  return typeof value === 'string' && value.trim().length > 0;
}

/** Allowed compare hub query keys; any other non-empty param is a non-canonical view. */
const COMPARE_INDEX_CANONICAL_QUERY_KEYS = new Set([
  'q',
  'cat',
  'sort',
  'page'
]);

function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseCompareIndexSearchParams(
  searchParams?: Record<string, string | string[] | undefined>
): CompareIndexQueryState {
  const q = firstValue(searchParams?.q).trim();
  const rawCategory = firstValue(searchParams?.cat).trim().toLowerCase();
  const rawSort = firstValue(searchParams?.sort).trim().toLowerCase();
  const rawPage = firstValue(searchParams?.page).trim();

  const category: CompareIndexCategory =
    rawCategory === 'universities' || rawCategory === 'states'
      ? rawCategory
      : 'all';

  const sort: CompareIndexSort = rawSort === 'title' ? 'title' : 'latest';

  return {
    q,
    category,
    sort,
    page: parsePositiveInt(rawPage, 1)
  };
}

/**
 * True when the compare hub URL should be `noindex, follow` (filters, pagination, or
 * unknown query keys such as `state` that are not part of the canonical index document).
 */
export function compareIndexHasNonCanonicalView(
  searchParams?: Record<string, string | string[] | undefined>
): boolean {
  const queryState = parseCompareIndexSearchParams(searchParams);
  if (
    queryState.page > 1 ||
    queryState.q.length > 0 ||
    queryState.category !== 'all' ||
    queryState.sort !== 'latest'
  ) {
    return true;
  }

  if (!searchParams) return false;

  for (const key of Object.keys(searchParams)) {
    if (COMPARE_INDEX_CANONICAL_QUERY_KEYS.has(key)) continue;
    if (hasNonEmptySearchParamValue(searchParams[key])) return true;
  }

  return false;
}

export function buildCompareIndexHref(
  page: number,
  state: Omit<CompareIndexQueryState, 'page'>,
  basePath = '/compare'
): string {
  const params = new URLSearchParams();
  const q = state.q.trim();
  if (q) params.set('q', q);
  if (state.category !== 'all') params.set('cat', state.category);
  if (state.sort !== 'latest') params.set('sort', state.sort);
  if (page > 1) params.set('page', String(page));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function sortCompareIndexSlice(
  items: CompareIndexItem[],
  sort: CompareIndexSort
): CompareIndexItem[] {
  return [...items].sort((left, right) => {
    if (sort === 'title') {
      return left.title.localeCompare(right.title, 'en', { sensitivity: 'base' });
    }

    const leftTs = left.updatedAt ? Date.parse(left.updatedAt) : 0;
    const rightTs = right.updatedAt ? Date.parse(right.updatedAt) : 0;
    if (leftTs !== rightTs) return rightTs - leftTs;
    return left.title.localeCompare(right.title, 'en', { sensitivity: 'base' });
  });
}

/** State, university, state, university… then the longer tail. */
export function interleaveStateThenUniversity(
  states: CompareIndexItem[],
  universities: CompareIndexItem[]
): CompareIndexItem[] {
  const out: CompareIndexItem[] = [];
  const max = Math.max(states.length, universities.length);
  for (let i = 0; i < max; i++) {
    if (i < states.length) out.push(states[i]);
    if (i < universities.length) out.push(universities[i]);
  }
  return out;
}

export function filterAndSortCompareIndexItems(
  items: CompareIndexItem[],
  state: Pick<CompareIndexQueryState, 'q' | 'category' | 'sort'>
): CompareIndexItem[] {
  const q = state.q.trim().toLowerCase();

  const filtered = items.filter((item) => {
    if (state.category !== 'all' && item.type !== state.category) return false;
    if (!q) return true;
    const haystack = `${item.title} ${item.description} ${item.slug}`
      .trim()
      .toLowerCase();
    return haystack.includes(q);
  });

  if (state.category !== 'all') {
    return sortCompareIndexSlice(filtered, state.sort);
  }

  const states = sortCompareIndexSlice(
    filtered.filter((item) => item.type === 'states'),
    state.sort
  );
  const universities = sortCompareIndexSlice(
    filtered.filter((item) => item.type === 'universities'),
    state.sort
  );
  return interleaveStateThenUniversity(states, universities);
}

export function paginateCompareIndexItems(
  items: CompareIndexItem[],
  page: number,
  pageSize = COMPARE_INDEX_PAGE_SIZE
) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  return {
    slice: items.slice(start, end),
    total,
    totalPages,
    currentPage
  };
}

export function compareCategoryCountsAfterQuery(
  items: CompareIndexItem[],
  q: string
): Record<Exclude<CompareIndexCategory, 'all'>, number> {
  const lowered = q.trim().toLowerCase();
  const visible = lowered
    ? items.filter((item) =>
        `${item.title} ${item.description} ${item.slug}`
          .trim()
          .toLowerCase()
          .includes(lowered)
      )
    : items;

  return {
    universities: visible.filter((item) => item.type === 'universities').length,
    states: visible.filter((item) => item.type === 'states').length
  };
}
