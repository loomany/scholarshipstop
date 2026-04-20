import { createPublicClient } from '@/utils/supabase/public';
import type { Database, Json } from '@/types_db';

export type StateComparisonDataJson = Record<string, unknown>;

export type StateComparePageRow = Pick<
  Database['public']['Tables']['state_compare_pages']['Row'],
  | 'id'
  | 'slug'
  | 'state_a_code'
  | 'state_b_code'
  | 'content_json'
  | 'ai_verdict'
  | 'meta_title'
  | 'meta_description'
  | 'status'
  | 'updated_at'
>;

export type StateRow = Pick<
  Database['public']['Tables']['states']['Row'],
  'id' | 'name' | 'slug' | 'code' | 'region' | 'description_json'
>;

export async function fetchStateComparisonDataRpc(
  stateACode: string,
  stateBCode: string
): Promise<StateComparisonDataJson | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_state_comparison_data', {
    p_state_a_code: stateACode,
    p_state_b_code: stateBCode
  });
  if (error) {
    console.error('[get_state_comparison_data]', error.message);
    return null;
  }
  return (data as StateComparisonDataJson) ?? null;
}

export async function fetchPublishedStateComparePageBySlug(
  slug: string
): Promise<{
  page: StateComparePageRow;
  stateA: StateRow;
  stateB: StateRow;
} | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;

  const { data: page, error } = await supabase
    .from('state_compare_pages')
    .select(
      'id, slug, state_a_code, state_b_code, content_json, ai_verdict, meta_title, meta_description, status, updated_at'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !page) return null;

  const { data: states, error: stateErr } = await supabase
    .from('states')
    .select('id, name, slug, code, region, description_json')
    .in('code', [page.state_a_code, page.state_b_code]);

  if (stateErr || !states || states.length < 2) return null;

  const byCode = new Map(states.map((state) => [state.code, state]));
  const stateA = byCode.get(page.state_a_code);
  const stateB = byCode.get(page.state_b_code);
  if (!stateA || !stateB) return null;

  return { page, stateA, stateB };
}

export async function fetchPublishedStateCompareSlugByCodes(
  stateACode: string,
  stateBCode: string
): Promise<string | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const codes = [stateACode.trim().toUpperCase(), stateBCode.trim().toUpperCase()].sort(
    (l, r) => l.localeCompare(r, 'en')
  );
  const { data, error } = await supabase
    .from('state_compare_pages')
    .select('slug')
    .eq('state_a_code', codes[0])
    .eq('state_b_code', codes[1])
    .eq('status', 'published')
    .maybeSingle();

  if (error) return null;
  return data?.slug?.trim() || null;
}

export type StateCompareIndexRow = Pick<
  Database['public']['Tables']['state_compare_pages']['Row'],
  'slug' | 'meta_title' | 'meta_description' | 'updated_at'
>;

const PUBLISHED_COMPARE_FETCH_BATCH = 1000;

export async function fetchRecentPublishedStateComparePages(limit = 10): Promise<StateCompareIndexRow[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('state_compare_pages')
    .select('slug, meta_title, meta_description, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}

/** All published rows for compare index / sitemap-style listing (paginates past PostgREST default cap). */
export async function fetchAllPublishedStateComparePages(): Promise<StateCompareIndexRow[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const out: StateCompareIndexRow[] = [];
  for (let from = 0; ; from += PUBLISHED_COMPARE_FETCH_BATCH) {
    const { data, error } = await supabase
      .from('state_compare_pages')
      .select('slug, meta_title, meta_description, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .range(from, from + PUBLISHED_COMPARE_FETCH_BATCH - 1);
    if (error) {
      console.error('[fetchAllPublishedStateComparePages]', error.message);
      return out;
    }
    const batch = data ?? [];
    out.push(...batch);
    if (batch.length < PUBLISHED_COMPARE_FETCH_BATCH) break;
  }
  return out;
}

export function stateComparisonGrantCountsOk(data: StateComparisonDataJson | null): boolean {
  if (!data || typeof data !== 'object') return false;
  const err = data['error'];
  if (typeof err === 'string' && err) return false;
  const a = data['state_a'] as Record<string, unknown> | undefined;
  const b = data['state_b'] as Record<string, unknown> | undefined;
  const ca = typeof a?.['grant_count'] === 'number' ? a['grant_count'] : 0;
  const cb = typeof b?.['grant_count'] === 'number' ? b['grant_count'] : 0;
  return ca >= 3 && cb >= 3;
}

export function stateContentJsonAsRecord(raw: Json | null): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}
