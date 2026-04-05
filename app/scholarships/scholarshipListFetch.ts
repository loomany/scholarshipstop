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
  longTailLegacySlugs?: string[];
  seoListingFallback?: boolean;
  slugOnlyMoreFilters?: MoreFiltersJson;
  requiredSeoTags?: string[];
};

export async function postScholarshipsList(
  body: ScholarshipsListPostBody
): Promise<ScholarshipsListResponse> {
  const res = await fetch('/api/scholarships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const raw = await res.text();
    let detail = '';
    try {
      const j = JSON.parse(raw) as { error?: string };
      if (typeof j?.error === 'string' && j.error.trim()) detail = j.error.trim();
    } catch {
      if (raw.trim()) detail = raw.trim().slice(0, 500);
    }
    throw new Error(
      detail
        ? `Failed to load scholarships (${res.status}): ${detail}`
        : `Failed to load scholarships (${res.status})`
    );
  }
  const data = (await res.json()) as ScholarshipsListResponse;
  if (!data.scholarships && Array.isArray(data.results)) {
    data.scholarships = data.results;
  }
  return data;
}

export async function postScholarshipsCount(
  body: ScholarshipsListPostBody
): Promise<{ total: number; page: number; limit: number; seoFallback?: SeoListingFallbackMeta }> {
  const sp = new URLSearchParams(body.searchParams);
  sp.set('count_only', '1');
  const res = await fetch('/api/scholarships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchParams: sp.toString(),
      moreFilters: body.moreFilters,
      longTailLegacySlugs: body.longTailLegacySlugs,
      seoListingFallback: body.seoListingFallback,
      slugOnlyMoreFilters: body.slugOnlyMoreFilters,
      requiredSeoTags: body.requiredSeoTags
    })
  });
  if (!res.ok) throw new Error('count failed');
  return res.json();
}

export async function postScholarshipsMeta(
  body: ScholarshipsListPostBody
): Promise<{ meta?: ScholarshipListMeta; page: number; limit: number }> {
  const sp = new URLSearchParams(body.searchParams);
  sp.set('meta_only', '1');
  const res = await fetch('/api/scholarships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchParams: sp.toString(),
      moreFilters: body.moreFilters,
      longTailLegacySlugs: body.longTailLegacySlugs,
      seoListingFallback: body.seoListingFallback,
      slugOnlyMoreFilters: body.slugOnlyMoreFilters,
      requiredSeoTags: body.requiredSeoTags
    })
  });
  if (!res.ok) throw new Error('meta failed');
  return res.json();
}

export type ScholarshipsMatchCountsResponse = {
  counts?: {
    bestMatches: number;
    recommended: number;
    matches: number;
    easyApply: number;
  } | null;
};

export async function postScholarshipsMatchCounts(body: {
  ignored?: string[];
}): Promise<ScholarshipsMatchCountsResponse> {
  const res = await fetch('/api/scholarships/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page: 1,
      limit: 1,
      bucket: 'matches',
      ignored: body.ignored ?? []
    }),
    cache: 'no-store'
  });
  if (res.status === 401) {
    return { counts: null };
  }
  if (!res.ok) throw new Error('match counts failed');
  const data = (await res.json()) as ScholarshipsMatchCountsResponse;
  return data;
}

export async function postScholarshipsMatchInvalidateSignal(): Promise<void> {
  try {
    await fetch('/api/scholarships/match/invalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
  } catch {
    // best effort only
  }
}
