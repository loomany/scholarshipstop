import { normalizeCategoryId } from '@/app/scholarships/scholarshipCategories';
import {
  parseCommaStateCodes,
  parseCommaUuids,
  parseCommaValues
} from '@/lib/scholarships-v2/normalization/legacy';
import type {
  ScholarshipFilterInput,
  ScholarshipSort,
  ScholarshipsV2Mode,
  UserCollectionTab
} from '@/lib/scholarships-v2/types';

type LegacySearchParamsAdapted = {
  filters: Partial<ScholarshipFilterInput>;
  mode: ScholarshipsV2Mode;
  page: number;
  pageSize: number;
  sort: ScholarshipSort;
};

const LEGACY_SORT_TO_V2: Record<string, ScholarshipSort> = {
  most_recent: 'recentlyUpdated',
  best_match: 'relevance',
  closest_deadline: 'deadlineSoon',
  highest_amount: 'amountHighToLow',
  lowest_amount: 'amountLowToHigh',
  verified_first: 'verifiedFirst',
  fewest_applicants: 'fewestApplicants',
  least_requirements: 'leastRequirements',
  magic: 'relevance'
};

function toSort(raw: string | null, mode: ScholarshipsV2Mode): ScholarshipSort {
  if (!raw) return mode === 'bestMatches' ? 'relevance' : 'recentlyUpdated';
  return LEGACY_SORT_TO_V2[raw] ?? (mode === 'bestMatches' ? 'relevance' : 'recentlyUpdated');
}

function toPage(raw: string | null): number {
  const parsed = Number.parseInt(String(raw ?? '1'), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function toModeAndTab(rawTab: string | null): {
  mode: ScholarshipsV2Mode;
  userCollectionTab: UserCollectionTab | null;
} {
  switch (rawTab) {
    case 'saved':
      return { mode: 'userCollections', userCollectionTab: 'saved' };
    case 'ignored':
      return { mode: 'userCollections', userCollectionTab: 'ignored' };
    case 'started':
      return { mode: 'userCollections', userCollectionTab: 'started' };
    case 'submitted':
      return { mode: 'userCollections', userCollectionTab: 'submitted' };
    case 'best-matches':
      return { mode: 'bestMatches', userCollectionTab: null };
    default:
      return { mode: 'catalog', userCollectionTab: null };
  }
}

function parseCategoryIds(raw: string | null): string[] {
  return parseCommaValues(raw)
    .map((value) => normalizeCategoryId(value) ?? value.trim().toLowerCase())
    .filter(Boolean);
}

export function adaptLegacySearchParamsToV2(
  searchParams: URLSearchParams,
  options?: { defaultPageSize?: number }
): LegacySearchParamsAdapted {
  const rawTab = searchParams.get('tab');
  const tabResolved = toModeAndTab(rawTab);

  return {
    filters: {
      q: searchParams.get('q')?.trim() ?? null,
      categoryIds: parseCategoryIds(searchParams.get('category')),
      categoryPageSlug:
        searchParams.get('category_page')?.trim().toLowerCase() ??
        searchParams.get('category_slug')?.trim().toLowerCase() ??
        null,
      stateCodes: parseCommaStateCodes(searchParams.get('state')),
      deadlinePreset: (searchParams.get('deadline') as ScholarshipFilterInput['deadlinePreset']) ?? 'any',
      userCollectionTab: tabResolved.userCollectionTab,
      savedIds: parseCommaUuids(searchParams.get('saved')),
      ignoredIds: parseCommaUuids(searchParams.get('ignored')),
      startedIds: parseCommaUuids(searchParams.get('started')),
      submittedIds: parseCommaUuids(searchParams.get('submitted'))
    },
    mode: tabResolved.mode,
    page: toPage(searchParams.get('page')),
    pageSize: options?.defaultPageSize ?? 12,
    sort: toSort(searchParams.get('sort'), tabResolved.mode)
  };
}
