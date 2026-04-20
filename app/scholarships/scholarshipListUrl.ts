/**
 * Listing URL helpers: page size, parsing, building query strings for /scholarships.
 */

import type { ScholarshipCategoryId } from './scholarshipCategories';
import { normalizeCategoryId, SCHOLARSHIP_CATEGORY_ORDER } from './scholarshipCategories';
import type { DeadlinePreset } from './moreFilters';
import type { SortOption } from './scholarshipSort';
import type { ScholarshipListTabId } from './scholarshipTabs';

export const SCHOLARSHIPS_PAGE_SIZE = 9;

/** Hub URL for the catalog “All” view (`tab=matches` + `scope=catalog`). */
export const SCHOLARSHIPS_HUB_ALL_MATCHES_HREF =
  '/scholarships?tab=matches&scope=catalog';

/** Hub URL for Best recommendation: tab + default sort (amount ↓, then newest). */
export const SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF =
  '/scholarships?tab=best-recommendation&scope=catalog&sort=best_recommendation';
/** Backward-compat alias while old imports are being migrated. */
export const SCHOLARSHIPS_HUB_BEST_MATCHES_HREF =
  SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF;

/** Saved grants (My scholarships → Saved); same data as `user_saved_scholarships`. */
export const SCHOLARSHIPS_HUB_SAVED_TAB_HREF = '/scholarships?tab=saved';

const SORT_VALUES = new Set<string>([
  'magic',
  'best_match',
  'best_recommendation',
  'highest_amount',
  'lowest_amount',
  'least_requirements',
  'closest_deadline',
  'fewest_applicants',
  'most_recent',
  'verified_first'
]);

const DEADLINE_VALUES = new Set<string>([
  'any',
  'lt1d',
  'd1_7',
  'w1_4',
  'gt4w'
]);

/** Aliases from marketing-style slugs → internal preset ids. */
const DEADLINE_ALIASES: Record<string, DeadlinePreset> = {
  '1_4_weeks': 'w1_4',
  '1-4_weeks': 'w1_4',
  less_than_1_day: 'lt1d',
  lt_1d: 'lt1d',
  '1_7_days': 'd1_7',
  '1-7_days': 'd1_7',
  more_than_4_weeks: 'gt4w',
  gt_4w: 'gt4w'
};

export function parseSortFromParam(raw: string | null): SortOption {
  /** Default: catalog ranking (`magic` / `applySort`), not bulk `updated_at` bumps. */
  if (!raw?.trim()) return 'magic';
  const k = raw.trim().toLowerCase();
  if (k === 'newest') return 'most_recent';
  if (k === 'best-match') return 'best_match';
  if (SORT_VALUES.has(k)) return k as SortOption;
  return 'magic';
}

export function parseCategoriesFromParam(
  raw: string | null
): Set<ScholarshipCategoryId> {
  const out = new Set<ScholarshipCategoryId>();
  if (!raw?.trim()) return out;
  for (const part of raw.split(',')) {
    const id = normalizeCategoryId(part);
    if (id) out.add(id);
  }
  return out;
}

export function serializeCategoriesParam(ids: Set<ScholarshipCategoryId>): string {
  const ordered = SCHOLARSHIP_CATEGORY_ORDER.filter((id) => ids.has(id));
  return ordered.join(',');
}

export function parseDeadlineFromParam(raw: string | null): DeadlinePreset | null {
  if (!raw?.trim()) return null;
  const k = raw.trim().toLowerCase();
  if (DEADLINE_ALIASES[k]) return DEADLINE_ALIASES[k];
  if (DEADLINE_VALUES.has(k)) return k as DeadlinePreset;
  return null;
}

/**
 * Safe page number: default 1, clamp to [1, totalPages], NaN → 1.
 */
export function clampScholarshipListPage(
  raw: string | null,
  totalPages: number
): number {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  const max = Math.max(1, totalPages);
  return Math.min(n, max);
}

export type ScholarshipListScope = 'personalized' | 'catalog';
export type ScholarshipAudienceParam = 'any' | 'international_friendly';

export function parseAudienceFromParam(
  raw: string | null
): ScholarshipAudienceParam {
  return raw === 'international_friendly' ? 'international_friendly' : 'any';
}

export type ScholarshipListUrlState = {
  tab: string | null;
  page: number;
  sort: SortOption;
  q: string;
  categories: Set<ScholarshipCategoryId>;
  deadline: DeadlinePreset | null;
  audience: ScholarshipAudienceParam;
  scope: ScholarshipListScope;
};

/**
 * Read listing-related params (page is not clamped here — use totalPages after filter).
 */
export function parseScholarshipListUrl(
  searchParams: URLSearchParams
): Omit<ScholarshipListUrlState, 'page'> & { pageRaw: string | null } {
  return {
    tab: searchParams.get('tab'),
    pageRaw: searchParams.get('page'),
    sort: parseSortFromParam(searchParams.get('sort')),
    q: searchParams.get('q')?.trim() ?? '',
    categories: parseCategoriesFromParam(searchParams.get('category')),
    deadline: parseDeadlineFromParam(searchParams.get('deadline')),
    audience: parseAudienceFromParam(searchParams.get('aud')),
    /** Listing is catalog-only; `scope` in the URL is ignored by the API. */
    scope: 'catalog'
  };
}

export function buildScholarshipListSearchParams(
  base: URLSearchParams,
  patch: {
    tab?: string | null;
    page?: number | null;
    sort?: SortOption | null;
    q?: string | null;
    categories?: Set<ScholarshipCategoryId> | null;
    deadline?: DeadlinePreset | null;
    audience?: ScholarshipAudienceParam | null;
    scope?: ScholarshipListScope | null;
    /** When true, omit page from output (same as page 1). */
    resetPage?: boolean;
  }
): URLSearchParams {
  const p = new URLSearchParams(base.toString());

  if (patch.tab !== undefined) {
    if (patch.tab === null || patch.tab === '') {
      p.delete('tab');
    } else if (patch.tab === 'matches') {
      p.set('tab', 'matches');
    } else {
      p.set('tab', patch.tab);
    }
  }

  if (patch.scope !== undefined && patch.scope !== null) {
    if (patch.scope === 'catalog') {
      p.set('scope', 'catalog');
    } else {
      p.delete('scope');
    }
  }

  if (patch.resetPage) {
    p.delete('page');
  } else if (patch.page !== undefined && patch.page !== null) {
    if (patch.page <= 1) {
      p.delete('page');
    } else {
      p.set('page', String(patch.page));
    }
  }

  if (patch.sort !== undefined && patch.sort !== null) {
    if (patch.sort === 'magic') {
      p.delete('sort');
    } else {
      p.set('sort', patch.sort);
    }
  }

  if (patch.q !== undefined && patch.q !== null) {
    const q = patch.q.trim();
    if (!q) {
      p.delete('q');
    } else {
      p.set('q', q);
    }
  }

  if (patch.categories !== undefined && patch.categories !== null) {
    const s = serializeCategoriesParam(patch.categories);
    if (!s) {
      p.delete('category');
    } else {
      p.set('category', s);
    }
  }

  if (patch.deadline !== undefined && patch.deadline !== null) {
    if (patch.deadline === 'any') {
      p.delete('deadline');
    } else {
      p.set('deadline', patch.deadline);
    }
  }

  if (patch.audience !== undefined && patch.audience !== null) {
    if (patch.audience === 'any') {
      p.delete('aud');
    } else {
      p.set('aud', patch.audience);
    }
  }

  return p;
}

/** URL для `/scholarships/category/[slug]`: без `tab`, остальное как у каталога. */
export function buildScholarshipCategoryPageSearchParams(
  base: URLSearchParams,
  patch: {
    page?: number | null;
    sort?: SortOption | null;
    q?: string | null;
    categories?: Set<ScholarshipCategoryId> | null;
    deadline?: DeadlinePreset | null;
    resetPage?: boolean;
  }
): URLSearchParams {
  const p = buildScholarshipListSearchParams(base, patch);
  p.delete('tab');
  return p;
}

/**
 * Ссылка на вкладку: только tab (чистый контекст раздела).
 * Сбрасываем page, q, category, sort, deadline — предсказуемо при смене Matches ↔ Saved и т.д.
 */
export function buildScholarshipTabHref(id: ScholarshipListTabId): string {
  if (id === 'best-recommendation') {
    return SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF;
  }
  if (id === 'matches') return '/scholarships?scope=catalog&tab=matches';
  if (id === 'hot-deadlines') return '/scholarships?tab=hot-deadlines';
  return `/scholarships?tab=${encodeURIComponent(id)}`;
}
