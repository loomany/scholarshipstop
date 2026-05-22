/**
 * Stage 5D-2 — Provider profile translation pilot (3 × ES/FR = 6 rows).
 *
 * Dry-run (default):
 *   npx tsx scripts/i18n/seed-provider-pilot-translations.ts
 *
 * Production apply:
 *   I18N_PILOT_ALLOW_DB_WRITES=1 I18N_PILOT_ALLOW_PRODUCTION=1 npx tsx scripts/i18n/seed-provider-pilot-translations.ts
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
  PROVIDER_PILOT_SLUGS,
  PROVIDER_PILOT_STAGE_MAX_ROWS,
  type ProviderPilotSlug
} from '@/lib/i18n/providerPilot/providerPilotSlugs';
import type { Database } from '@/types_db';

const MACHINE_MODEL = 'stage5d-provider-manual-pilot';
const DATE = '2026-05-22';
const ROWS_CSV = join(
  process.cwd(),
  'reports/seo',
  `i18n-stage5d-provider-pilot-rows-${DATE}.csv`
);

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
  const allowProd = process.env.I18N_PILOT_ALLOW_PRODUCTION === '1';
  const host = url.toLowerCase();
  const isLocal =
    host.includes('127.0.0.1') || host.includes('localhost') || host.endsWith('.local');
  if (host.includes('supabase.co') && !allowProd) {
    console.error(
      'Refusing hosted Supabase writes: set I18N_PILOT_ALLOW_PRODUCTION=1 for explicit production apply.'
    );
    process.exit(1);
  }
  if (!isLocal && !host.includes('supabase.co')) {
    console.error('Refusing unknown Supabase URL host.');
    process.exit(1);
  }
}

function escapeCsv(v: string) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function validateRows(rows: ProviderPilotSeedRow[]): void {
  if (rows.length !== PROVIDER_PILOT_STAGE_MAX_ROWS) {
    console.error(
      `Refusing batch: expected exactly ${PROVIDER_PILOT_STAGE_MAX_ROWS} rows, got ${rows.length}`
    );
    process.exit(1);
  }

  const slugs = new Set<string>();
  for (const row of rows) {
    if (row.source_type !== 'provider_profile') {
      console.error('Refusing: source_type must be provider_profile');
      process.exit(1);
    }
    if (row.locale !== 'es' && row.locale !== 'fr') {
      console.error('Refusing: locale must be es or fr', row.locale);
      process.exit(1);
    }
    if (!UUID_RE.test(row.source_id)) {
      console.error('Refusing: source_id must be provider UUID', row.source_slug);
      process.exit(1);
    }
    if (row.status !== 'published') {
      console.error('Refusing: stage 5D-2 requires published manual review', row);
      process.exit(1);
    }
    if (row.quality_score < 85) {
      console.error('Refusing: quality_score must be >= 85', row);
      process.exit(1);
    }
    if (!row.translated_title.trim() || !row.translated_body.trim()) {
      console.error('Refusing: missing translated title/body', row.source_slug, row.locale);
      process.exit(1);
    }
    slugs.add(row.source_slug);
  }

  if (slugs.size !== PROVIDER_PILOT_SLUGS.length) {
    console.error('Refusing: expected 3 distinct provider slugs');
    process.exit(1);
  }
}

function writeCsv(rows: ProviderPilotSeedRow[]) {
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const header =
    'source_type,source_id,source_slug,locale,status,quality_score,translated_title,translated_meta_title,machine_model\n';
  const body = rows
    .map((r) =>
      [
        r.source_type,
        r.source_id,
        r.source_slug,
        r.locale,
        r.status,
        String(r.quality_score),
        r.translated_title,
        r.translated_meta_title,
        MACHINE_MODEL
      ]
        .map(escapeCsv)
        .join(',')
    )
    .join('\n');
  writeFileSync(ROWS_CSV, header + body + '\n', 'utf8');
  console.log(`Wrote ${ROWS_CSV}`);
}

async function main() {
  if (process.env.I18N_PILOT_USE_SHELL_ENV !== '1') {
    loadEnvLocal();
  }

  if (process.env.I18N_OPENAI_TRANSLATION_DRAFTS === '1') {
    console.error('OpenAI drafts disabled for provider pilot.');
    process.exit(1);
  }

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

  const { data: providers, error } = await admin
    .from('providers')
    .select('id, slug, updated_at')
    .in('slug', [...PROVIDER_PILOT_SLUGS]);

  if (error) {
    console.error('providers lookup failed:', error.message);
    process.exit(1);
  }

  const slugToMeta = new Map<
    ProviderPilotSlug,
    { id: string; updated_at: string | null }
  >();
  for (const row of providers ?? []) {
    const slug = String(row.slug ?? '').trim().toLowerCase();
    const id = String(row.id ?? '').trim();
    if (slug && id && (PROVIDER_PILOT_SLUGS as readonly string[]).includes(slug)) {
      slugToMeta.set(slug as ProviderPilotSlug, {
        id,
        updated_at: row.updated_at ?? null
      });
    }
  }

  const missing = PROVIDER_PILOT_SLUGS.filter((s) => !slugToMeta.has(s));
  if (missing.length > 0) {
    console.error('Missing providers rows for required slugs:', missing.join(', '));
    process.exit(1);
  }

  const rows = buildProviderPilotSeedRows(slugToMeta);
  validateRows(rows);
  writeCsv(rows);

  console.log(`Planned ${rows.length} provider_profile rows (stage cap ${PROVIDER_PILOT_STAGE_MAX_ROWS}).`);
  console.log(`machine_model=${MACHINE_MODEL} — no OpenAI in this script.\n`);

  for (const row of rows) {
    console.log(
      [
        row.locale,
        row.source_slug,
        `source_id=${row.source_id}`,
        `status=${row.status}`,
        `quality_score=${row.quality_score}`
      ].join(' | ')
    );
  }

  if (dryRun) {
    console.log(
      '\nDry-run only. Set I18N_PILOT_ALLOW_DB_WRITES=1 (+ I18N_PILOT_ALLOW_PRODUCTION=1 on hosted) to upsert.'
    );
    return;
  }

  const { error: probeErr } = await admin.from('content_translations').select('id').limit(1);
  if (probeErr) {
    console.error('content_translations not reachable:', probeErr.message);
    process.exit(1);
  }

  const { count: beforeCount } = await admin
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', 'provider_profile');

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
        translated_by: 'stage5d-seed-script'
      },
      { onConflict: 'source_type,source_id,locale' }
    );
    if (upsertErr) {
      console.error('Upsert failed', row.source_slug, row.locale, upsertErr.message);
      process.exit(1);
    }
    upserted += 1;
  }

  const { count: afterCount } = await admin
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', 'provider_profile');

  const { count: catCount } = await admin
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', 'scholarship_category');

  const { count: resCount } = await admin
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', 'resource_article');

  console.log(
    JSON.stringify(
      {
        upserted,
        providerProfileBefore: beforeCount,
        providerProfileAfter: afterCount,
        scholarshipCategoryCount: catCount,
        resourceArticleCount: resCount
      },
      null,
      2
    )
  );
  console.log(`Seeded ${upserted} provider_profile rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
