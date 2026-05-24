import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PAGE = 1000;

async function queryPage(db: SupabaseClient, offset: number) {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { data, error } = await db
        .from('content_translations')
        .select('source_id')
        .eq('source_type', 'scholarship_detail')
        .in('locale', ['es', 'fr'])
        .range(offset, offset + PAGE - 1);
      if (error) throw new Error(error.message);
      return data ?? [];
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  throw lastError ?? new Error('fetchTranslatedScholarshipDetailSourceIds failed');
}

/** Load all translated scholarship_detail source_ids (paginated — avoids PostgREST 1000-row cap). */
export async function fetchTranslatedScholarshipDetailSourceIds(
  db: SupabaseClient
): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let offset = 0; ; offset += PAGE) {
    const data = await queryPage(db, offset);
    if (!data.length) break;
    for (const row of data) {
      const id = String(row.source_id ?? '').trim();
      if (id) ids.add(id);
    }
    if (data.length < PAGE) break;
  }
  return ids;
}
