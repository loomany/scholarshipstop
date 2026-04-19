/**
 * Read-only: how well `scholarships` rows are populated on columns that the hub
 * uses when merging `profiles` into Best / recommended filters.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/audit-profile-grant-coverage.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or anon; service preferred).
 */

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

type Row = Pick<
  Database['public']['Tables']['scholarships']['Row'],
  | 'field_of_study'
  | 'catalog_education_levels'
  | 'study_levels'
  | 'citizenship_statuses'
  | 'eligibility_tags'
  | 'gpa_bucket'
  | 'gpa_requirement_min'
  | 'state_codes'
  | 'location_tags'
>;

function loadEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key)'
    );
  }
  return { url, key };
}

function jsonArrayNonEmpty(j: unknown): boolean {
  return Array.isArray(j) && j.some((x) => String(x).trim().length > 0);
}

async function main() {
  const { url, key } = loadEnv();
  const supabase = createClient<Database>(url, key);

  const pageSize = 1000;
  let from = 0;
  let total = 0;
  const hit = {
    field_of_study: 0,
    catalog_education_levels: 0,
    study_levels: 0,
    catalog_or_study: 0,
    citizenship_statuses: 0,
    eligibility_tags: 0,
    eligibility_international_students: 0,
    gpa_bucket: 0,
    gpa_requirement_min: 0,
    state_or_location: 0
  };

  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(
        'field_of_study, catalog_education_levels, study_levels, citizenship_statuses, eligibility_tags, gpa_bucket, gpa_requirement_min, state_codes, location_tags'
      )
      .eq('is_active', true)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Row[];
    if (rows.length === 0) break;

    total += rows.length;
    for (const r of rows) {
      if (jsonArrayNonEmpty(r.field_of_study)) hit.field_of_study++;
      if (jsonArrayNonEmpty(r.catalog_education_levels)) hit.catalog_education_levels++;
      if (jsonArrayNonEmpty(r.study_levels)) hit.study_levels++;
      if (
        jsonArrayNonEmpty(r.catalog_education_levels) ||
        jsonArrayNonEmpty(r.study_levels)
      ) {
        hit.catalog_or_study++;
      }
      if (jsonArrayNonEmpty(r.citizenship_statuses)) hit.citizenship_statuses++;
      if (jsonArrayNonEmpty(r.eligibility_tags)) hit.eligibility_tags++;
      const et = r.eligibility_tags;
      if (Array.isArray(et) && et.some((x) => String(x).toLowerCase() === 'international_students')) {
        hit.eligibility_international_students++;
      }
      if (r.gpa_bucket != null && String(r.gpa_bucket).trim() !== '') hit.gpa_bucket++;
      if (r.gpa_requirement_min != null && !Number.isNaN(Number(r.gpa_requirement_min))) {
        hit.gpa_requirement_min++;
      }
      if (jsonArrayNonEmpty(r.state_codes) || jsonArrayNonEmpty(r.location_tags)) {
        hit.state_or_location++;
      }
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  const pct = (n: number) => (total ? ((100 * n) / total).toFixed(1) : '0.0');

  console.log(`Active scholarships scanned: ${total}\n`);
  console.log('Column / signal (share of active rows)');
  console.log('─'.repeat(52));
  console.log(`field_of_study (non-empty JSON array)     ${pct(hit.field_of_study)}%`);
  console.log(`catalog_education_levels (non-empty)      ${pct(hit.catalog_education_levels)}%`);
  console.log(`study_levels (non-empty)                  ${pct(hit.study_levels)}%`);
  console.log(`catalog OR study_levels (either)          ${pct(hit.catalog_or_study)}%`);
  console.log(`citizenship_statuses (non-empty)          ${pct(hit.citizenship_statuses)}%`);
  console.log(`eligibility_tags (any)                    ${pct(hit.eligibility_tags)}%`);
  console.log(`eligibility_tags has international_students ${pct(hit.eligibility_international_students)}%`);
  console.log(`gpa_bucket set                            ${pct(hit.gpa_bucket)}%`);
  console.log(`gpa_requirement_min set                   ${pct(hit.gpa_requirement_min)}%`);
  console.log(`state_codes OR location_tags (geo)        ${pct(hit.state_or_location)}%`);
  console.log('\nInterpretation (vs profile merge in code):');
  console.log(
    '- Profile school level → filters use catalog_education_levels OR study_levels (both counted above).'
  );
  console.log(
    '- Profile “International”: hub uses `citizenshipAudience=international_friendly` (broad OR), not the rare `international_students` eligibility tag alone (~0.5% rows).'
  );
  console.log(
    '- Profile field of study → field_of_study JSON + soft title/summary; empty JSON still can match via title.'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
