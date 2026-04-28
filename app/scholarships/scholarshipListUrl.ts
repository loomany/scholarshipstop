/**
 * Listing URL helpers: page size, parsing, building query strings for /scholarships.
 */

import type { ScholarshipCategoryId } from './scholarshipCategories';
import { normalizeCategoryId, SCHOLARSHIP_CATEGORY_ORDER } from './scholarshipCategories';
import { scholarshipHubQueryStringFromURLSearchParams } from './scholarshipHubCanonicalQueryString';
import {
  HUB_INTERNATIONAL_SEGMENT,
  tabToHubPath
} from './scholarshipHubPath';
import type { DeadlinePreset } from './moreFilters';
import type { SortOption } from './scholarshipSort';
import {
  parseHubScholarshipTabParam,
  type ScholarshipListTabId
} from './scholarshipTabs';

export const SCHOLARSHIPS_PAGE_SIZE = 9;

/** Hub URL for the catalog “All” view (matches tab). */
export const SCHOLARSHIPS_HUB_ALL_MATCHES_HREF = tabToHubPath('matches');

/** Hub URL for Best recommendation. */
export const SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF =
  tabToHubPath('best-recommendation');
/** Backward-compat alias while old imports are being migrated. */
export const SCHOLARSHIPS_HUB_BEST_MATCHES_HREF =
  SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF;
/** Catalog “International Friendly” (matches + international audience). */
export const SCHOLARSHIPS_HUB_INTERNATIONAL_FRIENDLY_HREF = tabToHubPath(
  HUB_INTERNATIONAL_SEGMENT
);

/** Saved grants (My scholarships → Saved); same data as `user_saved_scholarships`. */
export const SCHOLARSHIPS_HUB_SAVED_TAB_HREF = tabToHubPath('saved');

const SORT_VALUES = new Set<string>([
  'magic',
  'highest_amount',
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
  if (
    k === 'best-match' ||
    k === 'best_match' ||
    k === 'best_recommendation' ||
    k === 'lowest_amount'
  ) {
    return 'magic';
  }
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

/** Catalog hub: pathname for tab + audience (International Friendly has its own segment). */
export function hubCatalogPathnameForListingTab(
  tab: ScholarshipListTabId,
  audience: ScholarshipAudienceParam
): string {
  if (tab === 'matches' && audience === 'international_friendly') {
    return tabToHubPath(HUB_INTERNATIONAL_SEGMENT);
  }
  return tabToHubPath(tab);
}

/**
 * Product hub: browser URL is `/scholarships/hub/{segment}` + search without `tab`, `scope`, or `aud`.
 */
export function buildHubCatalogBrowserUrl(
  baseSearchParamsString: string,
  patch: Parameters<typeof buildScholarshipListSearchParams>[1],
  fallbackTab: ScholarshipListTabId
): { pathname: string; search: string } {
  const merged = buildScholarshipListSearchParams(
    new URLSearchParams(baseSearchParamsString),
    patch
  );
  const tab = parseHubScholarshipTabParam(merged.get('tab') ?? fallbackTab);
  const audience = parseAudienceFromParam(merged.get('aud'));
  const pathname = hubCatalogPathnameForListingTab(tab, audience);
  merged.delete('tab');
  merged.delete('scope');
  merged.delete('aud');
  const search = scholarshipHubQueryStringFromURLSearchParams(merged);
  return { pathname, search };
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
 * Ссылка на вкладку хаба: `/scholarships/hub/{segment}` (без query).
 * Смена вкладки сбрасывает фильтры через отдельные обработчики, не здесь.
 */
export function buildScholarshipTabHref(id: ScholarshipListTabId): string {
  return tabToHubPath(id);
}
