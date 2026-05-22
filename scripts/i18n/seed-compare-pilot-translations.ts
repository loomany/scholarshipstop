/**
 * Stage 5D — Compare university/state translation pilot (dry-run by default).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_ROWS = 20;
const UNIVERSITY_SLUGS = [
  'harvard-university',
  'stanford-university',
  'mit',
  'yale-university',
  'princeton-university'
] as const;
const STATE_SLUGS = [
  'california',
  'texas',
  'florida',
  'new-york',
  'illinois'
] as const;

const DATE = '2026-05-22';

async function main() {
  const rows: Array<{ source_type: string; source_slug: string; locale: string; status: string }> =
    [];
  for (const slug of UNIVERSITY_SLUGS) {
    rows.push({
      source_type: 'compare_university',
      source_slug: slug,
      locale: 'es',
      status: 'review_required'
    });
    rows.push({
      source_type: 'compare_university',
      source_slug: slug,
      locale: 'fr',
      status: 'review_required'
    });
  }
  for (const slug of STATE_SLUGS) {
    rows.push({
      source_type: 'compare_state',
      source_slug: slug,
      locale: 'es',
      status: 'review_required'
    });
    rows.push({
      source_type: 'compare_state',
      source_slug: slug,
      locale: 'fr',
      status: 'review_required'
    });
  }
  if (rows.length > MAX_ROWS) {
    console.error(`Refusing batch: ${rows.length} > ${MAX_ROWS}`);
    process.exit(1);
  }

  const csvPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5d-compare-pilot-rows-${DATE}.csv`
  );
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  writeFileSync(
    csvPath,
    'source_type,source_slug,locale,status\n' +
      rows.map((r) => `${r.source_type},${r.source_slug},${r.locale},${r.status}`).join('\n') +
      '\n',
    'utf8'
  );
  console.log(`Wrote ${csvPath} (${rows.length} planned rows).`);

  if (process.env.I18N_PILOT_ALLOW_DB_WRITES !== '1') {
    console.log('Dry-run only. No DB writes.');
    return;
  }
  console.error('Upsert not implemented — confirm compare slugs in catalog before seed.');
  process.exit(1);
}

main();
