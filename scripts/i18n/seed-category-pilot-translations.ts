/**
 * Stage 4C — Seed 22 published scholarship_category rows (local/staging only).
 *
 * Usage:
 *   I18N_PILOT_ALLOW_DB_WRITES=1 npx tsx scripts/i18n/seed-category-pilot-translations.ts
 *
 * Requires:
 * - Migration 20260521120000_content_translations.sql applied on target DB
 * - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Does NOT run on production unless I18N_PILOT_ALLOW_PRODUCTION=1 is also set.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { buildCategoryPilotSeedRows } from '@/lib/i18n/categoryPilot/categoryPilotTranslationsData';
import type { Database } from '@/types_db';

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
      // Prefer .env.local over inherited shell env (avoids accidental local Supabase writes).
      process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

function assertAllowedTarget(url: string) {
  const allowProd = process.env.I18N_PILOT_ALLOW_PRODUCTION === '1';
  const host = url.toLowerCase();
  const isLocal =
    host.includes('127.0.0.1') || host.includes('localhost') || host.endsWith('.local');
  if (host.includes('supabase.co') && !allowProd) {
    console.error(
      'Refusing hosted Supabase writes: set I18N_PILOT_ALLOW_PRODUCTION=1 for explicit production/staging apply.'
    );
    process.exit(1);
  }
  if (!isLocal && !host.includes('supabase.co')) {
    console.error('Refusing unknown Supabase URL host.');
    process.exit(1);
  }
}

async function main() {
  loadEnvLocal();
  if (process.env.I18N_PILOT_ALLOW_DB_WRITES !== '1') {
    console.error(
      'Refusing to write: set I18N_PILOT_ALLOW_DB_WRITES=1 to seed category pilot rows.'
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }
  assertAllowedTarget(url);

  const admin = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { error: probeErr } = await admin
    .from('content_translations')
    .select('id')
    .limit(1);
  if (probeErr) {
    console.error(
      'content_translations table not reachable. Apply migration first:\n',
      '  supabase/migrations/20260521120000_content_translations.sql'
    );
    console.error(probeErr.message);
    process.exit(1);
  }

  const rows = buildCategoryPilotSeedRows();
  let upserted = 0;
  for (const row of rows) {
    const { error } = await admin.from('content_translations').upsert(
      {
        source_type: row.source_type,
        source_id: row.source_id,
        locale: row.locale,
        status: row.status,
        source_hash: row.source_hash,
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
        machine_model: 'stage4c-manual-pilot',
        translated_by: 'stage4c-seed-script'
      },
      { onConflict: 'source_type,source_id,locale' }
    );
    if (error) {
      console.error('Upsert failed', row.source_id, row.locale, error.message);
      process.exit(1);
    }
    upserted += 1;
  }

  const outDir = join(process.cwd(), 'reports', 'seo');
  mkdirSync(outDir, { recursive: true });
  const csvPath = join(outDir, 'i18n-stage4c-category-pilot-rows-2026-05-21.csv');
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
  writeFileSync(csvPath, header + body, 'utf8');

  console.log(`Seeded ${upserted} content_translations rows (scholarship_category pilot).`);
  console.log(`CSV: ${csvPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
