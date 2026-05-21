import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildCategoryPilotSeedRows } from '@/lib/i18n/categoryPilot/categoryPilotTranslationsData';

const rows = buildCategoryPilotSeedRows();
const header =
  'source_type,source_id,locale,status,translated_title,translated_meta_title,translated_meta_description,quality_score,published_at,source_hash\n';
const body = rows
  .map((r) =>
    [
      r.source_type,
      r.source_id,
      r.locale,
      r.status,
      r.translated_title,
      r.translated_meta_title,
      r.translated_meta_description,
      r.quality_score,
      r.published_at,
      r.source_hash
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(',')
  )
  .join('\n');
const out = join(
  process.cwd(),
  'reports/seo',
  'i18n-stage4c-category-pilot-rows-2026-05-21.csv'
);
mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
writeFileSync(out, header + body, 'utf8');
console.log(`Wrote ${rows.length} rows to ${out}`);
