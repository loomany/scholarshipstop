/**
 * Stage 5D — Provider profile translation pilot (dry-run by default).
 *
 *   npx tsx scripts/i18n/seed-provider-pilot-translations.ts
 *   I18N_PILOT_ALLOW_DB_WRITES=1 npx tsx scripts/i18n/seed-provider-pilot-translations.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_ROWS = 10;
const PILOT_SLUGS = [
  'loyola-university-chicago',
  'harvard-university',
  'stanford-university',
  'university-of-michigan',
  'yale-university'
] as const;

const DATE = '2026-05-22';
const ROWS_CSV = join(
  process.cwd(),
  'reports/seo',
  `i18n-stage5d-provider-pilot-rows-${DATE}.csv`
);

type PlannedRow = {
  source_type: 'provider_profile';
  source_slug: string;
  locale: 'es' | 'fr';
  status: 'review_required';
};

function plannedRows(): PlannedRow[] {
  const rows: PlannedRow[] = [];
  for (const slug of PILOT_SLUGS) {
    rows.push({ source_type: 'provider_profile', source_slug: slug, locale: 'es', status: 'review_required' });
    rows.push({ source_type: 'provider_profile', source_slug: slug, locale: 'fr', status: 'review_required' });
  }
  return rows;
}

function writeCsv(rows: PlannedRow[]) {
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const header = 'source_type,source_slug,locale,status\n';
  const body = rows
    .map((r) => [r.source_type, r.source_slug, r.locale, r.status].join(','))
    .join('\n');
  writeFileSync(ROWS_CSV, header + body + '\n', 'utf8');
  console.log(`Wrote ${ROWS_CSV}`);
}

async function main() {
  const rows = plannedRows();
  if (rows.length > MAX_ROWS) {
    console.error(`Refusing batch: ${rows.length} rows exceeds limit ${MAX_ROWS}`);
    process.exit(1);
  }

  writeCsv(rows);
  console.log(`Planned ${rows.length} provider_profile rows (ES+FR × ${PILOT_SLUGS.length} slugs).`);
  console.log('Status default: review_required — no OpenAI in this script.');

  if (process.env.I18N_PILOT_ALLOW_DB_WRITES !== '1') {
    console.log('\nDry-run only. Set I18N_PILOT_ALLOW_DB_WRITES=1 (+ production flag if needed) to upsert.');
    console.log('Next: map provider UUIDs from DB and add translated_body drafts before write.');
    return;
  }

  if (process.env.I18N_OPENAI_TRANSLATION_DRAFTS === '1') {
    console.error('OpenAI drafts not implemented in overnight stub — use manual/review pipeline.');
    process.exit(1);
  }

  console.error(
    'DB upsert not wired in overnight stub: rows CSV + plan only. Implement upsert after provider field map review.'
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
