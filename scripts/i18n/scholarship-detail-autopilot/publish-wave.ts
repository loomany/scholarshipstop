import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { ScholarshipDetailPilotSeedRow } from '@/lib/i18n/scholarshipPilot/scholarshipPilotTranslationsData';

import { assertPublishGuards, DATE, isDryRun, loadEnvLocal } from './env';
import type { GeneratedWave } from './generate-overlays';
import { revalidateScholarshipDetailSitemaps } from './revalidate-detail-sitemaps';

function upsertRow(row: ScholarshipDetailPilotSeedRow, machineModel: string) {
  return {
    source_type: row.source_type,
    source_id: row.source_id,
    locale: row.locale,
    status: row.status,
    source_hash: row.source_hash,
    source_updated_at: row.source_updated_at,
    quality_score: row.quality_score,
    published_at: row.published_at,
    translated_slug: row.translated_slug,
    translated_title: row.translated_title,
    translated_meta_title: row.translated_meta_title,
    translated_meta_description: row.translated_meta_description,
    translated_summary: row.translated_summary,
    translated_body: row.translated_body,
    translated_faq_json: row.translated_faq_json,
    translated_extra_json: row.translated_extra_json,
    machine_model: machineModel,
    translated_by: 'scholarship-detail-autopilot'
  };
}

export type PublishResult = {
  upserted: number;
  csvPath: string;
  dryRun: boolean;
};

export async function publishWave(
  waveNum: number,
  generated: GeneratedWave,
  scholarshipCount: number
): Promise<PublishResult> {
  loadEnvLocal();
  const expectedRows = scholarshipCount * 2;
  const { rows, machineModel } = generated;

  if (rows.length !== expectedRows) {
    throw new Error(`Expected ${expectedRows} rows, got ${rows.length}`);
  }

  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const csvPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-6-autopilot-wave-${waveNum}-rows-${DATE}.csv`
  );

  writeFileSync(
    csvPath,
    'source_type,source_id,source_slug,locale,status,quality_score,machine_model\n' +
      rows
        .map((r) =>
          [r.source_type, r.source_id, r.source_slug, r.locale, r.status, String(r.quality_score), machineModel]
            .map((c) => `"${String(c).replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n') +
      '\n',
    'utf8'
  );

  if (isDryRun()) {
    return { upserted: 0, csvPath, dryRun: true };
  }

  assertPublishGuards();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
  });

  let upserted = 0;
  for (const row of rows) {
    const { error } = await admin.from('content_translations').upsert(upsertRow(row, machineModel), {
      onConflict: 'source_type,source_id,locale'
    });
    if (error) throw new Error(`${error.message} ${row.source_slug} ${row.locale}`);
    upserted++;
  }

  await revalidateScholarshipDetailSitemaps();

  return { upserted, csvPath, dryRun: false };
}
