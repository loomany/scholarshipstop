/**
 * Stage 5D — Provider profile translation pilot (dry-run by default).
 *
 *   npx tsx scripts/i18n/seed-provider-pilot-translations.ts
 *   I18N_PILOT_ALLOW_DB_WRITES=1 I18N_PILOT_ALLOW_PRODUCTION=1 npx tsx ...
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

const MAX_ROWS = 10;
const PILOT_SLUGS = [
  'loyola-university-chicago',
  'harvard-university',
  'stanford-university',
  'university-of-michigan',
  'yale-university'
] as const;

const DATE = '2026-05-22';
const ROWS_CSV = join(
  process.cwd(),
  'reports/seo',
  `i18n-stage5d-provider-pilot-rows-${DATE}.csv`
);

type PlannedRow = {
  source_type: 'provider_profile';
  source_id: string;
  source_slug: string;
  locale: 'es' | 'fr';
  status: 'review_required' | 'draft_machine';
  quality_score: number | null;
};

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

function writeCsv(rows: PlannedRow[]) {
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const header =
    'source_type,source_id,source_slug,locale,status,quality_score\n';
  const body = rows
    .map((r) =>
      [
        r.source_type,
        r.source_id,
        r.source_slug,
        r.locale,
        r.status,
        r.quality_score == null ? '' : String(r.quality_score)
      ]
        .map(escapeCsv)
        .join(',')
    )
    .join('\n');
  writeFileSync(ROWS_CSV, header + body + '\n', 'utf8');
  console.log(`Wrote ${ROWS_CSV}`);
}

function plannedRows(slugToId: Map<string, string>): PlannedRow[] {
  const rows: PlannedRow[] = [];
  for (const slug of PILOT_SLUGS) {
    const sourceId = slugToId.get(slug);
    if (!sourceId) continue;
    rows.push({
      source_type: 'provider_profile',
      source_id: sourceId,
      source_slug: slug,
      locale: 'es',
      status: 'review_required',
      quality_score: null
    });
    rows.push({
      source_type: 'provider_profile',
      source_id: sourceId,
      source_slug: slug,
      locale: 'fr',
      status: 'review_required',
      quality_score: null
    });
  }
  return rows;
}

async function main() {
  if (process.env.I18N_PILOT_USE_SHELL_ENV !== '1') {
    loadEnvLocal();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL and Supabase key.');
    process.exit(1);
  }

  const dryRun = process.env.I18N_PILOT_ALLOW_DB_WRITES !== '1';
  if (!dryRun) {
    assertAllowedTarget(url);
  }

  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: providers, error } = await client
    .from('providers')
    .select('id, slug')
    .in('slug', [...PILOT_SLUGS]);

  if (error) {
    console.error('providers lookup failed:', error.message);
    process.exit(1);
  }

  const slugToId = new Map<string, string>();
  for (const row of providers ?? []) {
    const slug = String(row.slug ?? '').trim().toLowerCase();
    const id = String(row.id ?? '').trim();
    if (slug && id) slugToId.set(slug, id);
  }

  const missing = PILOT_SLUGS.filter((s) => !slugToId.has(s));
  if (missing.length > 0) {
    console.warn('Skipping slugs with no providers row:', missing.join(', '));
  }
  const resolvedSlugs = PILOT_SLUGS.filter((s) => slugToId.has(s));
  if (resolvedSlugs.length === 0) {
    console.error('No pilot provider slugs resolved in providers table.');
    process.exit(1);
  }

  const rows = plannedRows(slugToId);
  if (rows.length > MAX_ROWS) {
    console.error(`Refusing batch: ${rows.length} rows exceeds limit ${MAX_ROWS}`);
    process.exit(1);
  }

  writeCsv(rows);

  console.log(`Planned ${rows.length} provider_profile rows (max ${MAX_ROWS}).`);
  console.log('Status default: review_required — not published, no sitemap exposure.\n');

  for (const row of rows) {
    console.log(
      [
        row.locale,
        row.source_slug,
        `source_id=${row.source_id}`,
        `status=${row.status}`,
        `quality_score=${row.quality_score ?? 'n/a'}`
      ].join(' | ')
    );
  }

  if (dryRun) {
    console.log(
      '\nDry-run only. Set I18N_PILOT_ALLOW_DB_WRITES=1 (+ I18N_PILOT_ALLOW_PRODUCTION=1 on hosted) to upsert.'
    );
    return;
  }

  if (process.env.I18N_OPENAI_TRANSLATION_DRAFTS === '1') {
    console.error('OpenAI drafts not enabled for provider pilot.');
    process.exit(1);
  }

  console.error(
    'DB upsert not wired: review CSV + publish manually after human QA.'
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
