import { unstable_cache } from 'next/cache';

import { createPublicClient } from '@/utils/supabase/public';
import type { Database, Json } from '@/types_db';

export type ComparisonDataJson = Record<string, unknown>;

async function fetchComparisonDataRpcUncached(
  instA: string,
  instB: string
): Promise<ComparisonDataJson | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_comparison_data', {
    p_inst_a: instA,
    p_inst_b: instB
  });
  if (error) {
    console.error('[get_comparison_data]', error.message);
    return null;
  }
  return (data as ComparisonDataJson) ?? null;
}

export const fetchComparisonDataRpc = unstable_cache(
  fetchComparisonDataRpcUncached,
  ['university-comparison-data-rpc-v2'],
  { revalidate: 300 }
);

export type ComparePageRow = Pick<
  Database['public']['Tables']['compare_pages']['Row'],
  | 'id'
  | 'slug'
  | 'inst_a_id'
  | 'inst_b_id'
  | 'content_json'
  | 'ai_verdict'
  | 'meta_title'
  | 'meta_description'
  | 'status'
  | 'updated_at'
>;

export type InstitutionRow = Pick<
  Database['public']['Tables']['institutions']['Row'],
  'id' | 'name' | 'slug' | 'logo_url' | 'city' | 'state' | 'country' | 'website_url'
>;

async function fetchPublishedComparePageBySlugUncached(
  slug: string
): Promise<{
  page: ComparePageRow;
  instA: InstitutionRow;
  instB: InstitutionRow;
} | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;

  const { data: page, error } = await supabase
    .from('compare_pages')
    .select(
      'id, slug, inst_a_id, inst_b_id, content_json, ai_verdict, meta_title, meta_description, status, updated_at'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !page) return null;

  const { data: insts, error: instErr } = await supabase
    .from('institutions')
    .select('id, name, slug, logo_url, city, state, country, website_url')
    .in('id', [page.inst_a_id, page.inst_b_id]);

  if (instErr || !insts || insts.length < 2) return null;

  const byId = new Map(insts.map((i) => [i.id, i]));
  const instA = byId.get(page.inst_a_id);
  const instB = byId.get(page.inst_b_id);
  if (!instA || !instB) return null;

  return { page, instA, instB };
}

export const fetchPublishedComparePageBySlug = unstable_cache(
  fetchPublishedComparePageBySlugUncached,
  ['published-university-compare-page-by-slug-v2'],
  { revalidate: 300 }
);

export type UniversityCompareIndexRow = Pick<
  Database['public']['Tables']['compare_pages']['Row'],
  'slug' | 'meta_title' | 'meta_description' | 'updated_at'
>;

const PUBLISHED_COMPARE_FETCH_BATCH = 1000;

export async function fetchRecentPublishedUniversityComparePages(
  limit = 10
): Promise<UniversityCompareIndexRow[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('compare_pages')
    .select('slug, meta_title, meta_description, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}

/** All published rows for compare index (paginates past PostgREST default cap). */
export async function fetchAllPublishedUniversityComparePages(): Promise<UniversityCompareIndexRow[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const out: UniversityCompareIndexRow[] = [];
  for (let from = 0; ; from += PUBLISHED_COMPARE_FETCH_BATCH) {
    const { data, error } = await supabase
      .from('compare_pages')
      .select('slug, meta_title, meta_description, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .range(from, from + PUBLISHED_COMPARE_FETCH_BATCH - 1);
    if (error) {
      console.error('[fetchAllPublishedUniversityComparePages]', error.message);
      return out;
    }
    const batch = data ?? [];
    out.push(...batch);
    if (batch.length < PUBLISHED_COMPARE_FETCH_BATCH) break;
  }
  return out;
}

export function comparisonGrantCountsOk(data: ComparisonDataJson | null): boolean {
  if (!data || typeof data !== 'object') return false;
  const err = data['error'];
  if (typeof err === 'string' && err) return false;
  const a = data['institution_a'] as Record<string, unknown> | undefined;
  const b = data['institution_b'] as Record<string, unknown> | undefined;
  const ca = typeof a?.['grant_count'] === 'number' ? a['grant_count'] : 0;
  const cb = typeof b?.['grant_count'] === 'number' ? b['grant_count'] : 0;
  return ca >= 3 && cb >= 3;
}

export function contentJsonAsRecord(raw: Json | null): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}
