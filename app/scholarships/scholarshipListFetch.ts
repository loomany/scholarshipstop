import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import type {
  ScholarshipListMeta,
  SeoListingFallbackMeta
} from '@/lib/scholarships/scholarshipListServer';
import type { MoreFiltersJson } from '@/lib/scholarships/scholarshipListApiCodec';

export type ScholarshipsListResponse = {
  scholarships: Scholarship[];
  /** Same rows as `scholarships` when returned by POST list (alias). */
  results?: Scholarship[];
  total: number;
  page: number;
  limit: number;
  meta?: ScholarshipListMeta;
  errorMessage?: string;
  matchPaywall?: { lockedCount: number; visibleMax: number };
  isProSubscriber?: boolean;
  seoFallback?: SeoListingFallbackMeta;
};

export function normalizeScholarshipsListRows(
  data: ScholarshipsListResponse
): Scholarship[] {
  const rows = data.scholarships ?? data.results;
  return Array.isArray(rows) ? rows : [];
}

export type ScholarshipsListPostBody = {
  searchParams: string;
  moreFilters?: MoreFiltersJson;
  /** `null` = no saved preset (Saved Filters sidebar count = 0). Omit on legacy clients. */
  savedFiltersSnapshot?: MoreFiltersJson | null;
  /** Guest Best recommendation: allow result preview after the inline wizard is finished. */
  guestBestRecommendationPreviewEnabled?: boolean;
  longTailLegacySlugs?: string[];
  seoListingFallback?: boolean;
  slugOnlyMoreFilters?: MoreFiltersJson;
  requiredSeoTags?: string[];
  providerSlug?: string | null;
  /** Sidebar-only meta refresh can skip category dropdown counts. */
  sidebarOnlyMeta?: boolean;
};

async function readScholarshipsApiError(res: Response, fallback: string): Promise<Error> {
  const raw = await res.text();
  let detail = '';
  try {
    const j = JSON.parse(raw) as { error?: string };
    if (typeof j?.error === 'string' && j.error.trim()) detail = j.error.trim();
  } catch {
    if (raw.trim()) detail = raw.trim().slice(0, 500);
  }
  return new Error(
    detail ? `${fallback} (${res.status}): ${detail}` : `${fallback} (${res.status})`
  );
}

export function scholarshipRequestErrorMessage(
  error: unknown,
  fallback = 'Failed to load scholarships.'
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

export async function postScholarshipsList(
  body: ScholarshipsListPostBody,
  options?: { signal?: AbortSignal }
): Promise<ScholarshipsListResponse> {
  const res = await fetch('/api/scholarships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: options?.signal,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw await readScholarshipsApiError(res, 'Failed to load scholarships');
  }
  const data = (await res.json()) as ScholarshipsListResponse;
  if (!data.scholarships && Array.isArray(data.results)) {
    data.scholarships = data.results;
  }
  return data;
}

export async function postScholarshipsCount(
  body: ScholarshipsListPostBody,
  options?: { signal?: AbortSignal }
): Promise<{ total: number; page: number; limit: number; seoFallback?: SeoListingFallbackMeta }> {
  const sp = new URLSearchParams(body.searchParams);
  sp.set('count_only', '1');
  const res = await fetch('/api/scholarships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: options?.signal,
    body: JSON.stringify({
      searchParams: sp.toString(),
      moreFilters: body.moreFilters,
      savedFiltersSnapshot: body.savedFiltersSnapshot,
      guestBestRecommendationPreviewEnabled:
        body.guestBestRecommendationPreviewEnabled,
      longTailLegacySlugs: body.longTailLegacySlugs,
      seoListingFallback: body.seoListingFallback,
      slugOnlyMoreFilters: body.slugOnlyMoreFilters,
      requiredSeoTags: body.requiredSeoTags,
      providerSlug: body.providerSlug,
      sidebarOnlyMeta: body.sidebarOnlyMeta
    })
  });
  if (!res.ok) throw await readScholarshipsApiError(res, 'Scholarship count failed');
  return res.json();
}

export async function postScholarshipsMeta(
  body: ScholarshipsListPostBody,
  options?: { signal?: AbortSignal }
): Promise<{ meta?: ScholarshipListMeta; page: number; limit: number }> {
  const sp = new URLSearchParams(body.searchParams);
  sp.set('meta_only', '1');
  const res = await fetch('/api/scholarships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: options?.signal,
    body: JSON.stringify({
      searchParams: sp.toString(),
      moreFilters: body.moreFilters,
      savedFiltersSnapshot: body.savedFiltersSnapshot,
      guestBestRecommendationPreviewEnabled:
        body.guestBestRecommendationPreviewEnabled,
      longTailLegacySlugs: body.longTailLegacySlugs,
      seoListingFallback: body.seoListingFallback,
      slugOnlyMoreFilters: body.slugOnlyMoreFilters,
      requiredSeoTags: body.requiredSeoTags,
      providerSlug: body.providerSlug,
      sidebarOnlyMeta: body.sidebarOnlyMeta
    })
  });
  if (!res.ok) throw await readScholarshipsApiError(res, 'Scholarship meta failed');
  return res.json();
}

