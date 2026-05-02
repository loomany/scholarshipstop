import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

import type { ScholarshipMatchDbRow } from './types';

const PAGE = 1000;

const BAD_STATUS = new Set(['archived', 'deleted', 'closed', 'inactive', 'draft']);

const SELECT =
  'id, slug, title, scholarship_status, is_indexable, international_friendly_listing, description, summary_short, eligibility_text, category, category_slug, tags, study_levels, field_of_study, location_scope, award_amount_text, deadline_text, deadline_date';

export async function fetchScholarshipsForArticleMatching(
  supabase: SupabaseClient<Database>,
  options: { onlyInternationalFriendly?: boolean } = {}
): Promise<ScholarshipMatchDbRow[]> {
  const out: ScholarshipMatchDbRow[] = [];
  let from = 0;
  for (;;) {
    let query = (supabase as any)
      .from('scholarships_safe_listing')
      .select(SELECT)
      .range(from, from + PAGE - 1);
    if (options.onlyInternationalFriendly) {
      query = query.eq('international_friendly_listing', true);
    }
    const { data, error } = await query;

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ScholarshipMatchDbRow[];
    if (batch.length === 0) break;
    for (const row of batch) {
      const slug = row.slug?.trim();
      if (!slug) continue;
      const st = row.scholarship_status?.trim().toLowerCase() ?? '';
      if (st && BAD_STATUS.has(st)) continue;
      if (row.is_indexable === false) continue;
      out.push(row);
    }
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return out;
}
