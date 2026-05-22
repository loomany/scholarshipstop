/**
 * Stage 5F — Essay guide translation pilot (6 rows max).
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import {
  buildEssayPilotSeedRows,
  type EssayPilotSeedRow
} from '@/lib/i18n/essayPilot/essayPilotTranslationsData';
import {
  ESSAY_PILOT_SLUGS,
  ESSAY_PILOT_STAGE_MAX_ROWS,
  type EssayPilotSlug
} from '@/lib/i18n/essayPilot/essayPilotSlugs';
import type { Database } from '@/types_db';

const DATE = '2026-05-22';
const MACHINE_MODEL = 'stage5f-essay-manual-pilot';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function validateRows(rows: EssayPilotSeedRow[]) {
  if (rows.length !== ESSAY_PILOT_STAGE_MAX_ROWS) {
    console.error(`Refusing: expected ${ESSAY_PILOT_STAGE_MAX_ROWS} rows, got ${rows.length}`);
    process.exit(1);
  }
  const slugs = new Set<string>();
  for (const row of rows) {
    if (row.source_type !== 'essay_guide') process.exit(1);
    if (row.status !== 'published' || row.quality_score < 85) process.exit(1);
    if (!UUID_RE.test(row.source_id)) process.exit(1);
    slugs.add(row.source_slug);
  }
  if (slugs.size !== ESSAY_PILOT_SLUGS.length) process.exit(1);
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

  const { data: essays, error } = await admin
    .from('essays')
    .select('id, slug, updated_at')
    .in('slug', [...ESSAY_PILOT_SLUGS]);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const slugToMeta = new Map<EssayPilotSlug, { id: string; updated_at: string | null }>();
  for (const row of essays ?? []) {
    const slug = String(row.slug ?? '').trim().toLowerCase();
    const id = String(row.id ?? '').trim();
    if (slug && id && ESSAY_PILOT_SLUGS.includes(slug as EssayPilotSlug)) {
      slugToMeta.set(slug as EssayPilotSlug, { id, updated_at: row.updated_at ?? null });
    }
  }
  const missing = ESSAY_PILOT_SLUGS.filter((s) => !slugToMeta.has(s));
  if (missing.length) {
    console.error('Missing essays:', missing.join(', '));
    process.exit(1);
  }

  const rows = buildEssayPilotSeedRows(slugToMeta);
  validateRows(rows);

  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const csvPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5f-essay-detail-pilot-rows-${DATE}.csv`
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
            MACHINE_MODEL
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
        machine_model: MACHINE_MODEL,
        translated_by: 'stage5f-seed-script'
      },
      { onConflict: 'source_type,source_id,locale' }
    );
    if (upsertErr) {
      console.error(upsertErr.message);
      process.exit(1);
    }
    upserted += 1;
  }
  console.log(JSON.stringify({ upserted, machine_model: MACHINE_MODEL }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
