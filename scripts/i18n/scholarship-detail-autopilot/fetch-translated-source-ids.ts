import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PAGE = 1000;

/** Load all translated scholarship_detail source_ids (paginated — avoids PostgREST 1000-row cap). */
export async function fetchTranslatedScholarshipDetailSourceIds(
  db: SupabaseClient
): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db
      .from('content_translations')
      .select('source_id')
      .eq('source_type', 'scholarship_detail')
      .in('locale', ['es', 'fr'])
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const row of data) {
      const id = String(row.source_id ?? '').trim();
      if (id) ids.add(id);
    }
    if (data.length < PAGE) break;
  }
  return ids;
}
