/**
 * Stage 5G — Compare university/state translation pilot (8 rows max).
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import {
  buildComparePilotSeedRows,
  type ComparePilotSeedRow
} from '@/lib/i18n/comparePilot/comparePilotTranslationsData';
import {
  COMPARE_PILOT_MAX_ROWS,
  COMPARE_STATE_PILOT_SLUGS,
  COMPARE_UNIVERSITY_PILOT_SLUGS,
  type CompareStatePilotSlug,
  type CompareUniversityPilotSlug
} from '@/lib/i18n/comparePilot/comparePilotSlugs';
import type { Database } from '@/types_db';

const DATE = '2026-05-22';

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

function machineModel(sourceType: ComparePilotSeedRow['source_type']) {
  return sourceType === 'compare_university'
    ? 'stage5g-compare-university-manual-pilot'
    : 'stage5g-compare-state-manual-pilot';
}

function validateRows(rows: ComparePilotSeedRow[]) {
  if (rows.length > COMPARE_PILOT_MAX_ROWS || rows.length === 0) {
    console.error(`Refusing: expected <= ${COMPARE_PILOT_MAX_ROWS} rows, got ${rows.length}`);
    process.exit(1);
  }
  if (rows.length !== COMPARE_PILOT_MAX_ROWS) {
    console.error(`Refusing: expected exactly ${COMPARE_PILOT_MAX_ROWS} rows for this phase`);
    process.exit(1);
  }
  for (const row of rows) {
    if (row.status !== 'published' || row.quality_score < 85) process.exit(1);
  }
}

async function main() {
  if (process.env.I18N_PILOT_USE_SHELL_ENV !== '1') loadEnvLocal();

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

  const { data: uniPages, error: uniErr } = await admin
    .from('compare_pages')
    .select('id, slug, updated_at')
    .in('slug', [...COMPARE_UNIVERSITY_PILOT_SLUGS]);
  if (uniErr) {
    console.error(uniErr.message);
    process.exit(1);
  }

  const { data: statePages, error: stateErr } = await admin
    .from('state_compare_pages')
    .select('id, slug, updated_at')
    .in('slug', [...COMPARE_STATE_PILOT_SLUGS]);
  if (stateErr) {
    console.error(stateErr.message);
    process.exit(1);
  }

  const uniMeta = new Map<
    CompareUniversityPilotSlug,
    { id: string; updated_at: string | null }
  >();
  for (const row of uniPages ?? []) {
    const slug = String(row.slug ?? '').trim().toLowerCase();
    const id = String(row.id ?? '').trim();
    if (slug && id && COMPARE_UNIVERSITY_PILOT_SLUGS.includes(slug as CompareUniversityPilotSlug)) {
      uniMeta.set(slug as CompareUniversityPilotSlug, {
        id,
        updated_at: row.updated_at ?? null
      });
    }
  }

  const stateMeta = new Map<
    CompareStatePilotSlug,
    { id: string; updated_at: string | null }
  >();
  for (const row of statePages ?? []) {
    const slug = String(row.slug ?? '').trim().toLowerCase();
    const id = String(row.id ?? '').trim();
    if (slug && id && COMPARE_STATE_PILOT_SLUGS.includes(slug as CompareStatePilotSlug)) {
      stateMeta.set(slug as CompareStatePilotSlug, {
        id,
        updated_at: row.updated_at ?? null
      });
    }
  }

  const missingUni = COMPARE_UNIVERSITY_PILOT_SLUGS.filter((s) => !uniMeta.has(s));
  const missingState = COMPARE_STATE_PILOT_SLUGS.filter((s) => !stateMeta.has(s));
  if (missingUni.length || missingState.length) {
    console.error('Missing compare pages:', [...missingUni, ...missingState].join(', '));
    process.exit(1);
  }

  const rows = buildComparePilotSeedRows(uniMeta, stateMeta);
  validateRows(rows);

  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const csvPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5g-compare-detail-pilot-rows-${DATE}.csv`
  );
  writeFileSync(
    csvPath,
    'source_type,source_id,source_slug,locale,status,quality_score,machine_model\n' +
      rows
        .map((r) =>
          [
            r.source_type,
            r.source_id,
            r.source_slug,
            r.locale,
            r.status,
            String(r.quality_score),
            machineModel(r.source_type)
          ]
            .map(escapeCsv)
            .join(',')
        )
        .join('\n') +
      '\n',
    'utf8'
  );
  console.log(`Wrote ${csvPath}`);
  for (const row of rows) {
    console.log([row.locale, row.source_type, row.source_slug, row.source_id].join(' | '));
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
        machine_model: machineModel(row.source_type),
        translated_by: 'stage5g-seed-script'
      },
      { onConflict: 'source_type,source_id,locale' }
    );
    if (upsertErr) {
      console.error(upsertErr.message);
      process.exit(1);
    }
    upserted += 1;
  }
  console.log(JSON.stringify({ upserted }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
