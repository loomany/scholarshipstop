/**
 * Backfill structured `scholarships` columns used by hub profile filters (Best recommendation):
 * citizenship_statuses, catalog_education_levels + study_levels, field_of_study, gpa_bucket /
 * gpa_requirement_min, state_codes, location_tags — inferred from title + eligibility/description
 * text when those fields are empty.
 *
 * Default: dry-run (counts + sample). Writes require service role.
 *
 *   npx tsx scripts/backfill-scholarship-catalog-match-fields.ts
 *   npx tsx scripts/backfill-scholarship-catalog-match-fields.ts --verbose
 *   npx tsx scripts/backfill-scholarship-catalog-match-fields.ts --all-rows
 *   npx tsx scripts/backfill-scholarship-catalog-match-fields.ts --apply
 *
 * Optional:
 *   --limit=N   process at most N rows (dry-run or apply), useful for smoke tests
 */

import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';

import {
  proposeScholarshipCatalogBackfill,
  type ScholarshipRowForCatalogBackfill
} from '../lib/scholarships/catalogEnrichment/proposeScholarshipCatalogBackfill';
import { ACTIVE_CATALOG_SELECT } from '../lib/scholarships/supabase';
import { enqueueScholarshipUrlsForScript } from './lib/googleIndexing';
import type { Database } from '../types_db';

const ROOT = path.resolve(__dirname, '..');
const PAGE_SIZE = 400;

const SELECT_COLUMNS = `${ACTIVE_CATALOG_SELECT},eligibility_text,requirements_text,full_content_html`;

function loadEnvFiles() {
  for (const name of ['.env', '.env.local']) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let limit: number | null = null;
  for (const a of argv) {
    const m = /^--limit=(\d+)$/.exec(a);
    if (m) limit = Math.max(1, parseInt(m[1]!, 10));
  }
  return {
    apply: argv.includes('--apply'),
    allRows: argv.includes('--all-rows'),
    verbose: argv.includes('--verbose'),
    limit
  };
}

function assertWritableSupabaseKey(apply: boolean) {
  if (!apply) return;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (!key) {
    throw new Error(
      'Backfill apply requires SUPABASE_SERVICE_ROLE_KEY. Anon keys are not sufficient for this workflow.'
    );
  }
  if (key.startsWith('sb_publishable_')) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY looks like a publishable key. Use the real service-role secret.'
    );
  }
}

type Pending = {
  id: string;
  slug: string | null;
  patch: Record<string, unknown>;
  reasons: string[];
};

async function main() {
  loadEnvFiles();
  const { apply, allRows, verbose, limit } = parseArgs();
  assertWritableSupabaseKey(apply);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and a Supabase key');
  }

  const supabase = createClient<Database>(url, key);
  const pending: Pending[] = [];
  const stats: Record<string, number> = {};

  let from = 0;
  let scanned = 0;
  for (;;) {
    if (limit != null && scanned >= limit) break;

    const rangeEnd = from + PAGE_SIZE - 1;
    let q = supabase
      .from('scholarships')
      .select(SELECT_COLUMNS)
      .order('id', { ascending: true })
      .range(from, rangeEnd);
    if (!allRows) {
      q = q.eq('is_active', true);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as ScholarshipRowForCatalogBackfill[];
    if (rows.length === 0) break;

    for (const raw of rows) {
      if (limit != null && scanned >= limit) break;
      scanned += 1;

      const proposed = proposeScholarshipCatalogBackfill(raw);
      if (!proposed) continue;

      const patchKeys = Object.keys(proposed.patch);
      for (const k of patchKeys) {
        stats[k] = (stats[k] ?? 0) + 1;
      }

      pending.push({
        id: raw.id,
        slug: raw.slug ?? null,
        patch: proposed.patch as Record<string, unknown>,
        reasons: proposed.reasons
      });

      if (verbose && pending.length <= 6) {
        console.log('\n--- sample ---');
        console.log(`id=${raw.id} slug=${raw.slug ?? ''}`);
        console.log(`  ${proposed.reasons.join(' | ')}`);
      }
    }

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`Scanned: ${scanned} scholarship row(s).`);
  console.log(`Would update: ${pending.length} row(s) with at least one inferred field.\n`);
  if (Object.keys(stats).length > 0) {
    console.log('Patch keys (row counts):');
    for (const k of Object.keys(stats).sort()) {
      console.log(`  ${k}: ${stats[k]}`);
    }
    console.log('');
  }

  if (!apply) {
    console.log(
      'Dry-run only — no DB writes. Review samples above, then run with --apply (and SUPABASE_SERVICE_ROLE_KEY).'
    );
    return;
  }

  const BATCH = 30;
  let ok = 0;
  let fail = 0;
  const updatedRows: Array<{ id: string; slug?: string | null }> = [];

  console.log(`\nApplying ${pending.length} update(s)…`);
  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map((p) =>
        supabase
          .from('scholarships')
          .update(p.patch)
          .eq('id', p.id)
          .select('id, slug')
          .maybeSingle()
          .then((r) => ({ ...r, inputId: p.id, inputSlug: p.slug }))
      )
    );
    for (const r of results) {
      if (r.error) {
        fail += 1;
        console.error('Update error:', r.error.message);
      } else {
        ok += 1;
        updatedRows.push({
          id: r.data?.id ?? r.inputId,
          slug: r.data?.slug ?? r.inputSlug ?? null
        });
      }
    }
  }
  console.log(`Updates: ${ok} ok, ${fail} failed.`);

  if (updatedRows.length > 0) {
    const queue = await enqueueScholarshipUrlsForScript(
      updatedRows,
      'script:backfill-scholarship-catalog-match-fields'
    );
    console.log(
      `Google indexing queue: +${queue.enqueued} scholarship URL(s), total queued ${queue.total}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
