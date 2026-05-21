/**
 * Stage 4D.1 — Seed 50 published resource_article rows (25 × ES/FR), local/staging only.
 *
 * Usage:
 *   I18N_PILOT_ALLOW_DB_WRITES=1 npx tsx scripts/i18n/seed-resource-pilot-translations.ts
 *
 * Dry-run (default): omit I18N_PILOT_ALLOW_DB_WRITES
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import {
  buildResourcePilotSeedRows,
  type ResourcePilotSeedRow
} from '@/lib/i18n/resourcePilot/resourcePilotTranslationsData';
import {
  RESOURCE_PILOT_SLUGS,
  type ResourcePilotSlug
} from '@/lib/i18n/resourcePilot/resourcePilotSlugs';
import type { Database } from '@/types_db';

const DATE = '2026-05-21';
const ROWS_CSV = join(
  process.cwd(),
  'reports/seo',
  `i18n-stage4d-resource-pilot-rows-${DATE}.csv`
);

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

function writeRowsCsv(rows: ResourcePilotSeedRow[]) {
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const header =
    'source_type,source_id,source_slug,locale,status,translated_title,translated_meta_title,translated_meta_description,quality_score,source_hash\n';
  const body = rows
    .map((r) =>
      [
        r.source_type,
        r.source_id,
        r.source_slug,
        r.locale,
        r.status,
        r.translated_title,
        r.translated_meta_title,
        r.translated_meta_description,
        String(r.quality_score),
        r.source_hash
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
  const dryRun = process.env.I18N_PILOT_ALLOW_DB_WRITES !== '1';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }
  if (!dryRun) {
    assertAllowedTarget(url);
  }

  const admin = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: posts, error: postsErr } = await admin
    .from('content_posts')
    .select('id, slug, title, meta_title, meta_description, body_html, updated_at')
    .eq('status', 'published')
    .in('slug', [...RESOURCE_PILOT_SLUGS]);

  if (postsErr) {
    console.error(postsErr.message);
    process.exit(1);
  }

  const slugToMeta = new Map<
    ResourcePilotSlug,
    {
      id: string;
      title: string;
      meta_title: string | null;
      meta_description: string | null;
      body_html: string | null;
      faq: unknown;
      updated_at: string | null;
    }
  >();

  for (const row of posts ?? []) {
    const slug = String(row.slug ?? '').trim().toLowerCase();
    if (!RESOURCE_PILOT_SLUGS.includes(slug as ResourcePilotSlug)) continue;
    slugToMeta.set(slug as ResourcePilotSlug, {
      id: String(row.id),
      title: String(row.title ?? ''),
      meta_title: row.meta_title,
      meta_description: row.meta_description,
      body_html: row.body_html,
      faq: null,
      updated_at: row.updated_at
    });
  }

  const missing = RESOURCE_PILOT_SLUGS.filter((s) => !slugToMeta.has(s));
  if (missing.length > 0) {
    console.error(
      `Missing ${missing.length} published content_posts for pilot slugs:\n`,
      missing.join('\n')
    );
    process.exit(1);
  }

  const rows = buildResourcePilotSeedRows(slugToMeta);
  writeRowsCsv(rows);

  console.log(
    JSON.stringify(
      {
        dryRun,
        target: url.replace(/https:\/\/([^.]+).*/, 'https://$1…'),
        rowCount: rows.length,
        slugs: RESOURCE_PILOT_SLUGS.length
      },
      null,
      2
    )
  );

  if (dryRun) {
    console.log('\nDry-run only. Set I18N_PILOT_ALLOW_DB_WRITES=1 to upsert.');
    return;
  }

  const { error: probeErr } = await admin.from('content_translations').select('id').limit(1);
  if (probeErr) {
    console.error('content_translations not reachable:', probeErr.message);
    process.exit(1);
  }

  let upserted = 0;
  for (const row of rows) {
    const { error } = await admin.from('content_translations').upsert(
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
        machine_model: 'stage4d-manual-pilot',
        translated_by: 'stage4d-seed-script'
      },
      { onConflict: 'source_type,source_id,locale' }
    );
    if (error) {
      console.error('Upsert failed:', row.source_slug, row.locale, error.message);
      process.exit(1);
    }
    upserted += 1;
  }

  console.log(`Upserted ${upserted} resource_article translation rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
