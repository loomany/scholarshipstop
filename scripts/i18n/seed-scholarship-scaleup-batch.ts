/**
 * Lean scale-up batch seeder (avoids heavy server-only import chain).
 * Usage: I18N_SCHOLARSHIP_PILOT_BATCH=scale-1 npx tsx scripts/i18n/seed-scholarship-scaleup-batch.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import {
  scholarshipRowToPilotFacts,
  type ScholarshipDbFactRow
} from '@/lib/i18n/scholarshipPilot/fetchScholarshipPilotFacts';
import {
  buildScholarshipDetailPilotSeedRowsForSlugs,
  type ScholarshipDetailPilotSeedRow
} from '@/lib/i18n/scholarshipPilot/scholarshipPilotTranslationsData';
import {
  scaleupBatchSlugs,
  type ScholarshipScaleupBatchId
} from '@/lib/i18n/scholarshipPilot/scaleUpBatchSlugs';
import {
  scaleupBatchSlugsV2,
  type ScholarshipScaleupBatchV2Id
} from '@/lib/i18n/scholarshipPilot/scaleUpBatchSlugsV2';
import { validateScholarshipPilotSeedRows } from '@/lib/i18n/scholarshipPilot/validateScholarshipPilotSeedRows';
import type { Database } from '@/types_db';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[t.slice(0, eq).trim()] = v;
    }
  } catch {
    /* optional */
  }
}

function parseBatch(): number {
  const raw = (process.env.I18N_SCHOLARSHIP_PILOT_BATCH ?? 'scale-1').trim().toLowerCase();
  const m = raw.match(/^(?:scale|10h|batch)-?([1-9]|10)$/);
  if (!m) {
    console.error('Set I18N_SCHOLARSHIP_PILOT_BATCH=scale-1..scale-10');
    process.exit(1);
  }
  return Number(m[1]);
}

function slugsForGlobalBatch(batch: number): readonly string[] {
  if (batch >= 1 && batch <= 5) return scaleupBatchSlugs(batch as ScholarshipScaleupBatchId);
  if (batch >= 6 && batch <= 10) {
    return scaleupBatchSlugsV2((batch - 5) as ScholarshipScaleupBatchV2Id);
  }
  return [];
}

async function main() {
  console.log('[scaleup-seed] start');
  if (process.env.I18N_PILOT_USE_SHELL_ENV !== '1') loadEnvLocal();

  const batch = parseBatch();
  const slugs = slugsForGlobalBatch(batch);
  if (slugs.length !== 10) {
    console.error('Refusing: batch must have exactly 10 slugs');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Missing Supabase env');
    process.exit(1);
  }

  const dryRun = process.env.I18N_PILOT_ALLOW_DB_WRITES !== '1';
  if (!dryRun && url.includes('supabase.co') && process.env.I18N_PILOT_ALLOW_PRODUCTION !== '1') {
    console.error('Set I18N_PILOT_ALLOW_PRODUCTION=1 for production writes');
    process.exit(1);
  }

  const machineModel = `stage5e-scholarship-manual-batch-${batch}`;
  const publishedAt = `2026-05-23T${String(batch).padStart(2, '0')}:00:00.000Z`;

  const admin = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('[scaleup-seed] fetching scholarships', slugs.length);
  const { data: schRows, error: schErr } = await admin
    .from('scholarships')
    .select(
      'id, slug, updated_at, title, provider_name, award_amount_text, award_amount_min, award_amount_max, currency, deadline_text, deadline_date'
    )
    .in('slug', [...slugs]);

  if (schErr) {
    console.error(schErr.message);
    process.exit(1);
  }

  const slugToMeta = new Map<string, { id: string; updated_at: string | null }>();
  const factsBySlug = new Map<string, ReturnType<typeof scholarshipRowToPilotFacts>>();
  for (const row of schRows ?? []) {
    const slug = String(row.slug ?? '').trim().toLowerCase();
    const id = String(row.id ?? '').trim();
    if (!slug || !id) continue;
    slugToMeta.set(slug, { id, updated_at: row.updated_at ?? null });
    factsBySlug.set(slug, scholarshipRowToPilotFacts(row as ScholarshipDbFactRow));
  }

  const missing = slugs.filter((s) => !slugToMeta.has(s));
  if (missing.length) {
    console.error('Missing slugs:', missing.join(', '));
    process.exit(1);
  }

  const rows = buildScholarshipDetailPilotSeedRowsForSlugs(
    slugToMeta,
    slugs,
    factsBySlug,
    machineModel,
    publishedAt
  );

  if (rows.length !== 20) {
    console.error(`Refusing: expected 20 rows, got ${rows.length}`);
    process.exit(1);
  }

  const valErrors = validateScholarshipPilotSeedRows(rows, factsBySlug);
  if (valErrors.length) {
    console.error('Validation failed:');
    valErrors.slice(0, 20).forEach((e) => console.error(' -', e));
    process.exit(1);
  }

  for (const row of rows) {
    if (row.source_type !== 'scholarship_detail' || row.status !== 'published') process.exit(1);
    if (!UUID_RE.test(row.source_id)) process.exit(1);
  }

  const rowDate = process.env.REPORT_DATE ?? '2026-05-23';
  const csvPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-scholarship-detail-batch-${batch}-rows-${rowDate}.csv`
  );
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
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

  console.log(`Batch scale-${batch}: ${rows.length} rows, machine_model=${machineModel}, OpenAI=$0`);
  console.log(`Wrote ${csvPath}`);
  for (const r of rows) {
    console.log(`${r.locale} | ${r.source_slug}`);
  }

  if (dryRun) {
    console.log('Dry-run only.');
    return;
  }

  let upserted = 0;
  for (const row of rows) {
    const { error } = await admin.from('content_translations').upsert(
      upsertRow(row, machineModel),
      { onConflict: 'source_type,source_id,locale' }
    );
    if (error) {
      console.error(error.message, row.source_slug, row.locale);
      process.exit(1);
    }
    upserted++;
  }
  console.log(JSON.stringify({ batch, upserted, machine_model: machineModel }, null, 2));
}

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
    translated_by: 'scaleup-seed-script'
  };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
