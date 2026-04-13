import type { EssayIndexRow } from '@/lib/essays/essaysServer';
import { paginateResources } from '@/lib/content-hub/resourcesIndexFilters';

export type EssayIndexSort = 'latest' | 'oldest';

/** `uncategorized` = essay has no linked scholarship category; otherwise scholarship `category_slug`. */
export const ESSAYS_INDEX_UNCATEGORIZED = 'uncategorized' as const;

export type EssaysIndexQueryState = {
  q: string;
  categoryKey: string | null;
  sort: EssayIndexSort;
  page: number;
};

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parsePageParam(
  raw: string | string[] | undefined
): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(String(s ?? '1'), 10);
  return Number.isNaN(n) || n < 1 ? 1 : n;
}

function parseSortParam(
  raw: string | string[] | undefined
): EssayIndexSort {
  const s = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
  return s === 'oldest' ? 'oldest' : 'latest';
}

function parseCategoryParam(
  raw: string | string[] | undefined
): string | null {
  const s = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!s) return null;
  return s;
}

export function parseEssaysIndexSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined
): EssaysIndexQueryState {
  const q = String(
    Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q ?? ''
  ).trim();

  const categoryKey = parseCategoryParam(searchParams?.cat);
  const sort = parseSortParam(searchParams?.sort);
  const page = parsePageParam(searchParams?.page);

  return { q, categoryKey, sort, page };
}

function rowCategoryKey(row: EssayIndexRow): string {
  const slug = row.linkedCategorySlug?.trim();
  return slug || ESSAYS_INDEX_UNCATEGORIZED;
}

export function essayMatchesIndexQuery(row: EssayIndexRow, q: string): boolean {
  const needle = normalizeForMatch(q);
  if (!needle) return true;

  const slug = row.slug?.trim() ?? '';
  const title = row.title?.trim() ?? '';
  const desc = row.meta_description?.trim() ?? '';
  const catLabel = row.linkedCategoryLabel?.trim() ?? '';
  const catSlug = row.linkedCategorySlug?.trim() ?? '';
  const blob = normalizeForMatch(
    `${slug} ${title} ${desc} ${catLabel} ${catSlug}`
  );
  return blob.includes(needle);
}

function passesCategory(row: EssayIndexRow, categoryKey: string | null): boolean {
  if (!categoryKey) return true;
  const key = rowCategoryKey(row);
  return key === categoryKey;
}

export function filterAndSortEssayIndexRows(
  rows: EssayIndexRow[],
  state: Pick<EssaysIndexQueryState, 'q' | 'categoryKey' | 'sort'>
): EssayIndexRow[] {
  const { q, categoryKey, sort } = state;

  let filtered = rows.filter((row) => essayMatchesIndexQuery(row, q));
  filtered = filtered.filter((row) => passesCategory(row, categoryKey));

  const mult = sort === 'oldest' ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (ta !== tb) return (ta - tb) * mult;
    return a.id.localeCompare(b.id);
  });

  return sorted;
}

export function essaysCategoryCountsAfterQuery(
  rows: EssayIndexRow[],
  q: string
): Record<string, number> {
  const out: Record<string, number> = {};

  for (const row of rows) {
    if (!essayMatchesIndexQuery(row, q)) continue;
    const key = rowCategoryKey(row);
    out[key] = (out[key] ?? 0) + 1;
  }

  return out;
}

export type EssayCategoryToolbarOption = {
  key: string;
  label: string;
  count: number;
};

/** Options for the Categories panel: stable label per slug from data, sorted by label. */
export function buildEssayCategoryToolbarOptions(
  rows: EssayIndexRow[],
  counts: Record<string, number>
): EssayCategoryToolbarOption[] {
  const labelByKey = new Map<string, string>();

  for (const row of rows) {
    const key = rowCategoryKey(row);
    if (labelByKey.has(key)) continue;
    if (key === ESSAYS_INDEX_UNCATEGORIZED) {
      labelByKey.set(key, 'Uncategorized');
      continue;
    }
    const label =
      row.linkedCategoryLabel?.trim() ||
      key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    labelByKey.set(key, label);
  }

  const keys = Object.keys(counts).filter((k) => (counts[k] ?? 0) > 0);
  keys.sort((a, b) =>
    (labelByKey.get(a) ?? a).localeCompare(labelByKey.get(b) ?? b, undefined, {
      sensitivity: 'base'
    })
  );

  return keys.map((key) => ({
    key,
    label: labelByKey.get(key) ?? key,
    count: counts[key] ?? 0
  }));
}

export function buildEssaysIndexHref(
  page: number,
  state: Pick<EssaysIndexQueryState, 'q' | 'categoryKey' | 'sort'>,
  basePath: string
): string {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set('q', state.q.trim());
  if (state.categoryKey) params.set('cat', state.categoryKey);
  if (state.sort !== 'latest') params.set('sort', state.sort);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export { paginateResources as paginateEssayIndex };
