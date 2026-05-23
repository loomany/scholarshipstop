/**
 * Backfill translated_title for published autopilot scholarship_detail rows.
 * Default: dry-run. Production write requires I18N_PILOT_ALLOW_* env guards.
 *
 * Usage:
 *   npx tsx scripts/i18n/scholarship-detail-autopilot/backfill-translated-titles.ts
 *   npx tsx scripts/i18n/scholarship-detail-autopilot/backfill-translated-titles.ts --write
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { scholarshipRowToPilotFacts } from '@/lib/i18n/scholarshipPilot/fetchScholarshipPilotFacts';
import type { ScholarshipDbFactRow } from '@/lib/i18n/scholarshipPilot/fetchScholarshipPilotFacts';

import { assertPublishGuards, DATE, isDryRun, loadEnvLocal } from './env';

const MACHINE_PREFIX = 'stage5e-scholarship-autopilot-wave-';
const FORBIDDEN = [/localhost/i, /\/en\//i, /127\.0\.0\.1/];

type AffectedRow = {
  source_id: string;
  locale: 'es' | 'fr';
  machine_model: string;
  translated_title: string | null;
};

function isEmptyTitle(v: unknown): boolean {
  return !String(v ?? '').trim();
}

function proposedTitle(sch: ScholarshipDbFactRow): string {
  return scholarshipRowToPilotFacts(sch).officialTitle.trim();
}

function validateTitle(title: string, slug: string): string[] {
  const issues: string[] = [];
  if (!title.trim()) issues.push('empty after trim');
  if (title.length > 500) issues.push('title too long');
  for (const re of FORBIDDEN) {
    if (re.test(title)) issues.push(`forbidden ${re}`);
  }
  if (title !== title.trim()) issues.push('leading/trailing whitespace');
  if (!title && !slug) issues.push('no title or slug fallback');
  return issues;
}

async function main() {
  const write = process.argv.includes('--write');
  loadEnvLocal();

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rows, error } = await db
    .from('content_translations')
    .select('source_id, locale, machine_model, translated_title, translated_body, translated_summary')
    .eq('source_type', 'scholarship_detail')
    .in('locale', ['es', 'fr'])
    .eq('status', 'published')
    .like('machine_model', `${MACHINE_PREFIX}%`);

  if (error) throw new Error(error.message);

  const affected = (rows ?? []).filter((r) => isEmptyTitle(r.translated_title)) as AffectedRow[];
  if (!affected.length) {
    console.log('[backfill] no affected rows');
    return;
  }

  const sourceIds = [...new Set(affected.map((r) => r.source_id))];
  const schById = new Map<string, ScholarshipDbFactRow>();

  for (let i = 0; i < sourceIds.length; i += 80) {
    const slice = sourceIds.slice(i, i + 80);
    const { data: schRows, error: schErr } = await db
      .from('scholarships')
      .select(
        'id, slug, title, provider_name, award_amount_text, award_amount_min, award_amount_max, currency, deadline_text, deadline_date'
      )
      .in('id', slice);
    if (schErr) throw new Error(schErr.message);
    for (const s of schRows ?? []) {
      schById.set(String(s.id), s as ScholarshipDbFactRow);
    }
  }

  const updates: {
    source_id: string;
    locale: string;
    source_type: string;
    translated_title: string;
    machine_model: string;
  }[] = [];
  const validationErrors: string[] = [];

  for (const row of affected) {
    const sch = schById.get(row.source_id);
    if (!sch) {
      validationErrors.push(`${row.source_id} ${row.locale}: scholarship missing`);
      continue;
    }
    const slug = String(sch.slug ?? '').trim().toLowerCase();
    const title = proposedTitle(sch);
    const issues = validateTitle(title, slug);
    if (issues.length) {
      validationErrors.push(`${slug} ${row.locale}: ${issues.join('; ')}`);
      continue;
    }
    updates.push({
      source_type: 'scholarship_detail',
      source_id: row.source_id,
      locale: row.locale,
      machine_model: row.machine_model,
      translated_title: title
    });
  }

  const sample = updates.slice(0, 10).map((u) => {
    const sch = schById.get(u.source_id);
    return {
      slug: sch?.slug,
      locale: u.locale,
      wave: u.machine_model,
      proposed_title: u.translated_title
    };
  });

  console.log(
    JSON.stringify(
      {
        dryRun: !write || isDryRun(),
        affectedRows: affected.length,
        updatesReady: updates.length,
        validationErrors: validationErrors.length,
        sample
      },
      null,
      2
    )
  );

  if (validationErrors.length) {
    console.error('Validation errors:', validationErrors.slice(0, 20));
    process.exit(1);
  }

  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const csvPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-7-title-backfill-plan-${DATE}.csv`
  );
  writeFileSync(
    csvPath,
    'source_id,slug,locale,machine_model,proposed_title\n' +
      updates
        .map((u) => {
          const sch = schById.get(u.source_id);
          const slug = String(sch?.slug ?? '');
          return [u.source_id, slug, u.locale, u.machine_model, u.translated_title]
            .map((c) => `"${String(c).replace(/"/g, '""')}"`)
            .join(',');
        })
        .join('\n') +
      '\n',
    'utf8'
  );
  console.log('Wrote', csvPath);

  if (!write || isDryRun()) {
    console.log('[backfill] dry-run only — no DB writes');
    return;
  }

  assertPublishGuards();
  let upserted = 0;
  for (const u of updates) {
    const { error: upErr } = await db
      .from('content_translations')
      .update({ translated_title: u.translated_title })
      .eq('source_type', 'scholarship_detail')
      .eq('source_id', u.source_id)
      .eq('locale', u.locale)
      .eq('machine_model', u.machine_model)
      .eq('status', 'published');
    if (upErr) throw new Error(`${upErr.message} ${u.source_id} ${u.locale}`);
    upserted++;
  }
  console.log('[backfill] updated rows:', upserted);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
