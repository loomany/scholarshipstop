/**
 * Stage 5E — Scholarship detail translation pilot.
 *
 * Batch 5E-1 (default): 1 scholarship × ES/FR = 2 rows
 *   npx tsx scripts/i18n/seed-scholarship-detail-pilot-translations.ts
 *
 * Batch 5E-2: 5 scholarships × ES/FR = 10 rows
 *   I18N_SCHOLARSHIP_PILOT_BATCH=5e-2 npx tsx scripts/i18n/seed-scholarship-detail-pilot-translations.ts
 *
 * Production apply: add I18N_PILOT_ALLOW_DB_WRITES=1 I18N_PILOT_ALLOW_PRODUCTION=1
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import {
  buildScholarshipDetailPilotSeedRows,
  type ScholarshipDetailPilotSeedRow
} from '@/lib/i18n/scholarshipPilot/scholarshipPilotTranslationsData';
import {
  SCHOLARSHIP_DETAIL_PILOT_BATCH_1_MAX_ROWS,
  SCHOLARSHIP_DETAIL_PILOT_BATCH_2_MAX_ROWS,
  scholarshipPilotSlugsForBatch,
  type ScholarshipDetailPilotSlug,
  type ScholarshipPilotBatchId
} from '@/lib/i18n/scholarshipPilot/scholarshipPilotSlugs';
import type { Database } from '@/types_db';

const DATE = '2026-05-22';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveBatch(): ScholarshipPilotBatchId {
  const raw = (process.env.I18N_SCHOLARSHIP_PILOT_BATCH ?? '5e-1').trim().toLowerCase();
  if (raw === '5e-2' || raw === 'plus5' || raw === '5e2') return '5e-2';
  if (raw === 'all') return 'all';
  return '5e-1';
}

function batchConfig(batch: ScholarshipPilotBatchId) {
  if (batch === '5e-2') {
    return {
      machineModel: 'stage5e-scholarship-manual-pilot-2',
      maxRows: SCHOLARSHIP_DETAIL_PILOT_BATCH_2_MAX_ROWS,
      publishedAt: '2026-05-22T18:00:00.000Z',
      csvName: `i18n-stage5e-2-scholarship-detail-plus5-rows-${DATE}.csv`,
      expectedSlugCount: 5
    };
  }
  if (batch === 'all') {
    return {
      machineModel: 'stage5e-scholarship-manual-pilot',
      maxRows: SCHOLARSHIP_DETAIL_PILOT_BATCH_1_MAX_ROWS + SCHOLARSHIP_DETAIL_PILOT_BATCH_2_MAX_ROWS,
      publishedAt: '2026-05-22T16:00:00.000Z',
      csvName: `i18n-stage5e-scholarship-detail-pilot-rows-${DATE}.csv`,
      expectedSlugCount: 6
    };
  }
  return {
    machineModel: 'stage5e-scholarship-manual-pilot',
    maxRows: SCHOLARSHIP_DETAIL_PILOT_BATCH_1_MAX_ROWS,
    publishedAt: '2026-05-22T16:00:00.000Z',
    csvName: `i18n-stage5e-scholarship-detail-pilot-rows-${DATE}.csv`,
    expectedSlugCount: 1
  };
}

function loadEnvLocal(): void {
  const path = join(process.cwd(), '.env.local');
  try {
    const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

function assertAllowedTarget(url: string) {
  const allowProd = process.env.I18N_PILOT_ALLOW_PRODUCTION === '1';
  const host = url.toLowerCase();
  if (host.includes('supabase.co') && !allowProd) {
    console.error(
      'Refusing hosted Supabase writes: set I18N_PILOT_ALLOW_PRODUCTION=1 for explicit production apply.'
    );
    process.exit(1);
  }
}

function escapeCsv(v: string) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function validateRows(
  rows: ScholarshipDetailPilotSeedRow[],
  expectedCount: number,
  expectedSlugCount: number,
  machineModel: string
) {
  if (rows.length !== expectedCount) {
    console.error(
      `Refusing batch: expected exactly ${expectedCount} rows, got ${rows.length}`
    );
    process.exit(1);
  }

  const slugs = new Set<string>();
  for (const row of rows) {
    if (row.source_type !== 'scholarship_detail') {
      console.error('Refusing: source_type must be scholarship_detail');
      process.exit(1);
    }
    if (row.machine_model !== machineModel) {
      console.error('Refusing: unexpected machine_model', row.machine_model);
      process.exit(1);
    }
    if (row.locale !== 'es' && row.locale !== 'fr') {
      console.error('Refusing: locale must be es or fr', row.locale);
      process.exit(1);
    }
    if (!UUID_RE.test(row.source_id)) {
      console.error('Refusing: source_id must be scholarship UUID', row.source_slug);
      process.exit(1);
    }
    if (row.status !== 'published' || row.quality_score < 85) {
      console.error('Refusing: published + quality >= 85 required', row);
      process.exit(1);
    }
    if (!row.translated_title.trim() || !row.translated_body.trim()) {
      console.error('Refusing: missing translated title/body', row.source_slug, row.locale);
      process.exit(1);
    }
    slugs.add(row.source_slug);
  }

  if (slugs.size !== expectedSlugCount) {
    console.error(`Refusing: expected ${expectedSlugCount} distinct slugs, got ${slugs.size}`);
    process.exit(1);
  }
}

async function main() {
  if (process.env.I18N_PILOT_USE_SHELL_ENV !== '1') {
    loadEnvLocal();
  }

  const batch = resolveBatch();
  const config = batchConfig(batch);
  const slugs = scholarshipPilotSlugsForBatch(batch);
  const rowsCsv = join(process.cwd(), 'reports/seo', config.csvName);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const dryRun = process.env.I18N_PILOT_ALLOW_DB_WRITES !== '1';
  if (!dryRun) {
    assertAllowedTarget(url);
  }

  const admin = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: scholarships, error } = await admin
    .from('scholarships')
    .select('id, slug, updated_at')
    .in('slug', [...slugs]);

  if (error) {
    console.error('scholarships lookup failed:', error.message);
    process.exit(1);
  }

  const slugToMeta = new Map<
    ScholarshipDetailPilotSlug,
    { id: string; updated_at: string | null }
  >();
  for (const row of scholarships ?? []) {
    const slug = String(row.slug ?? '').trim().toLowerCase();
    const id = String(row.id ?? '').trim();
    if (slug && id && slugs.includes(slug)) {
      slugToMeta.set(slug as ScholarshipDetailPilotSlug, {
        id,
        updated_at: row.updated_at ?? null
      });
    }
  }

  const missing = slugs.filter((s) => !slugToMeta.has(s as ScholarshipDetailPilotSlug));
  if (missing.length > 0) {
    console.error('Missing scholarships rows for required slugs:', missing.join(', '));
    process.exit(1);
  }

  const rows = buildScholarshipDetailPilotSeedRows(
    slugToMeta,
    batch === 'all' ? 'all' : batch,
    config.machineModel,
    config.publishedAt
  );
  validateRows(rows, config.maxRows, config.expectedSlugCount, config.machineModel);

  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const header =
    'source_type,source_id,source_slug,locale,status,quality_score,translated_title,machine_model\n';
  writeFileSync(
    rowsCsv,
    header +
      rows
        .map((r) =>
          [
            r.source_type,
            r.source_id,
            r.source_slug,
            r.locale,
            r.status,
            String(r.quality_score),
            r.translated_title,
            r.machine_model
          ]
            .map(escapeCsv)
            .join(',')
        )
        .join('\n') +
      '\n',
    'utf8'
  );
  console.log(`Wrote ${rowsCsv}`);
  console.log(
    `Batch ${batch}: planned ${rows.length} rows, machine_model=${config.machineModel}\n`
  );

  for (const row of rows) {
    console.log(
      [row.locale, row.source_slug, `source_id=${row.source_id}`, `quality=${row.quality_score}`].join(
        ' | '
      )
    );
  }

  if (dryRun) {
    console.log('\nDry-run only. Set I18N_PILOT_ALLOW_DB_WRITES=1 (+ I18N_PILOT_ALLOW_PRODUCTION=1) to upsert.');
    return;
  }

  let upserted = 0;
  for (const row of rows) {
    const { error: upsertErr } = await admin.from('content_translations').upsert(
      {
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
        machine_model: row.machine_model,
        translated_by: 'stage5e-seed-script'
      },
      { onConflict: 'source_type,source_id,locale' }
    );
    if (upsertErr) {
      console.error('Upsert failed', row.source_slug, row.locale, upsertErr.message);
      process.exit(1);
    }
    upserted += 1;
  }
  console.log(JSON.stringify({ batch, upserted, machine_model: config.machineModel }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
