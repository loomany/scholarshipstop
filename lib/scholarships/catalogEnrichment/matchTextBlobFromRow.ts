import type { Database } from '@/types_db';

export type ScholarshipRowForMatchBlob = Pick<
  Database['public']['Tables']['scholarships']['Row'],
  | 'title'
  | 'summary_short'
  | 'summary_long'
  | 'description'
  | 'eligibility_text'
  | 'requirements_text'
  | 'requirements_text_clean'
  | 'who_can_apply'
  | 'state_territory_text'
  | 'institutions_text'
  | 'full_content_html'
>;

const MAX_HTML = 24_000;

/** Lowercased blob for citizenship / GPA / education / field-of-study heuristics (hub match filters). */
export function matchTextBlobFromRow(row: ScholarshipRowForMatchBlob): string {
  const html = (row.full_content_html ?? '').slice(0, MAX_HTML);
  return [
    row.title,
    row.summary_short,
    row.summary_long,
    row.description,
    row.eligibility_text,
    row.requirements_text,
    row.requirements_text_clean,
    row.who_can_apply,
    row.state_territory_text,
    row.institutions_text,
    html
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
}
