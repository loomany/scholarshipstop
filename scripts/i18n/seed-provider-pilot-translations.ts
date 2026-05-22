/**
 * Stage 5D — Provider profile translation pilot.
 *
 * Batch 1 (default): 3 providers × ES/FR = 6 rows
 * Batch 2: I18N_PROVIDER_PILOT_BATCH=5d-2 → 2 providers × ES/FR = 4 rows
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import {
  buildProviderPilotSeedRows,
  type ProviderPilotSeedRow
} from '@/lib/i18n/providerPilot/providerPilotTranslationsData';
import {
  PROVIDER_PILOT_BATCH_1_MAX_ROWS,
  PROVIDER_PILOT_BATCH_2_MAX_ROWS,
  providerPilotSlugsForBatch,
  type ProviderPilotBatchId,
  type ProviderPilotSlug
} from '@/lib/i18n/providerPilot/providerPilotSlugs';
import type { Database } from '@/types_db';

const DATE = '2026-05-22';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveBatch(): ProviderPilotBatchId {
  const raw = (process.env.I18N_PROVIDER_PILOT_BATCH ?? '5d-1').trim().toLowerCase();
  if (raw === '5d-2' || raw === 'plus2') return '5d-2';
  if (raw === 'all') return 'all';
  return '5d-1';
}

function batchConfig(batch: ProviderPilotBatchId) {
  if (batch === '5d-2') {
    return {
      machineModel: 'stage5d-provider-manual-pilot-2',
      maxRows: PROVIDER_PILOT_BATCH_2_MAX_ROWS,
      publishedAt: '2026-05-22T18:30:00.000Z',
      csv: `i18n-stage5d-provider-profile-plus2-rows-${DATE}.csv`,
      expectedSlugs: 2
    };
  }
  return {
    machineModel: 'stage5d-provider-manual-pilot',
    maxRows: PROVIDER_PILOT_BATCH_1_MAX_ROWS,
    publishedAt: '2026-05-22T14:00:00.000Z',
    csv: `i18n-stage5d-provider-pilot-rows-${DATE}.csv`,
    expectedSlugs: batch === 'all' ? 5 : 3
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
  if (url.includes('supabase.co') && process.env.I18N_PILOT_ALLOW_PRODUCTION !== '1') {
    console.error('Refusing hosted Supabase writes without I18N_PILOT_ALLOW_PRODUCTION=1');
    process.exit(1);
  }
}

function escapeCsv(v: string) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function validateRows(
  rows: ProviderPilotSeedRow[],
  maxRows: number,
  expectedSlugs: number,
  machineModel: string
) {
  if (rows.length !== maxRows) {
    console.error(`Refusing: expected ${maxRows} rows, got ${rows.length}`);
    process.exit(1);
  }
  const slugs = new Set<string>();
  for (const row of rows) {
    if (row.source_type !== 'provider_profile') process.exit(1);
    if (row.status !== 'published' || row.quality_score < 85) process.exit(1);
    if (!UUID_RE.test(row.source_id)) process.exit(1);
    slugs.add(row.source_slug);
  }
  if (slugs.size !== expectedSlugs) {
    console.error(`Refusing: expected ${expectedSlugs} slugs`);
    process.exit(1);
  }
  if (rows.some((r) => (r as { machine_model?: string }).machine_model)) {
    /* machine_model set at upsert */
  }
  void machineModel;
}

async function main() {
  if (process.env.I18N_PILOT_USE_SHELL_ENV !== '1') loadEnvLocal();

  const batch = resolveBatch();
  const config = batchConfig(batch);
  const slugs = providerPilotSlugsForBatch(batch);
  const dryRun = process.env.I18N_PILOT_ALLOW_DB_WRITES !== '1';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Missing Supabase env');
    process.exit(1);
  }
  if (!dryRun) assertAllowedTarget(url);

  const admin = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: providers, error } = await admin
    .from('providers')
    .select('id, slug, updated_at')
    .in('slug', [...slugs]);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const slugToMeta = new Map<ProviderPilotSlug, { id: string; updated_at: string | null }>();
  for (const row of providers ?? []) {
    const slug = String(row.slug ?? '').trim().toLowerCase();
    const id = String(row.id ?? '').trim();
    if (slug && id && slugs.includes(slug)) {
      slugToMeta.set(slug as ProviderPilotSlug, { id, updated_at: row.updated_at ?? null });
    }
  }
  const missing = slugs.filter((s) => !slugToMeta.has(s as ProviderPilotSlug));
  if (missing.length) {
    console.error('Missing providers:', missing.join(', '));
    process.exit(1);
  }

  const rows = buildProviderPilotSeedRows(
    slugToMeta,
    slugs as readonly ProviderPilotSlug[],
    config.publishedAt
  );
  validateRows(rows, config.maxRows, config.expectedSlugs, config.machineModel);

  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const csvPath = join(process.cwd(), 'reports/seo', config.csv);
  writeFileSync(
    csvPath,
    'source_type,source_id,source_slug,locale,status,quality_score,machine_model\n' +
      rows
        .map((r) =>
          [r.source_type, r.source_id, r.source_slug, r.locale, r.status, String(r.quality_score), config.machineModel]
            .map(escapeCsv)
            .join(',')
        )
        .join('\n') +
      '\n',
    'utf8'
  );
  console.log(`Wrote ${csvPath}`);
  for (const row of rows) {
    console.log([row.locale, row.source_slug, row.source_id].join(' | '));
  }

  if (dryRun) {
    console.log('\nDry-run only.');
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
        machine_model: config.machineModel,
        translated_by: 'stage5d-seed-script'
      },
      { onConflict: 'source_type,source_id,locale' }
    );
    if (upsertErr) {
      console.error(upsertErr.message);
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
