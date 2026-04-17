/**
 * Derive and optionally write `scholarships.seo_tags` from structured columns + text rules.
 *
 *   npx tsx scripts/backfill-scholarship-seo-tags.ts           # dry-run (default)
 *   npx tsx scripts/backfill-scholarship-seo-tags.ts --dry-run
 *   npx tsx scripts/backfill-scholarship-seo-tags.ts --apply   # writes to DB (use after review)
 *
 * Optional:
 *   --all-rows     include is_active = false (default: active only)
 *
 * Rules: data/seo-tag-text-rules.json
 * Logic: lib/scholarships/seoTags/deriveSeoTagsFromRow.ts
 */

import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';

import {
  deriveSeoTagsFromRow,
  type SeoTagSourceRow,
  type SeoTagTextRulesFile
} from '../lib/scholarships/seoTags/deriveSeoTagsFromRow';
import type { SeoCanonicalTag } from '../lib/scholarships/seoTags/vocabulary';
import { enqueueScholarshipUrlsForScript } from './lib/googleIndexing';
import type { Database } from '../types_db';

const ROOT = path.resolve(__dirname, '..');
const RULES_PATH = path.join(ROOT, 'data', 'seo-tag-text-rules.json');

const PAGE_SIZE = 500;
const SAMPLE_LIMIT = 3;

/** Tags for which we print sample rows in dry-run. */
const SAMPLE_TAGS: SeoCanonicalTag[] = [
  'first_generation',
  'international_students',
  'minority',
  'women',
  'engineering',
  'computer_science',
  'no_essay',
  'no_gpa_requirement'
];

const SELECT_COLUMNS = [
  'id',
  'slug',
  'title',
  'summary_short',
  'description',
  'requirements_text',
  'eligibility_text',
  'eligibility_tags',
  'catalog_education_levels',
  'gpa_bucket',
  'easy_apply_flags',
  'field_of_study',
  'study_levels',
  'payout_method',
  'award_amount_numeric_sort',
  'award_amount_text',
  'awards_text',
  'deadline_bucket',
  'is_verified',
  'financial_need_considered',
  'citizenship_statuses',
  'is_active',
  'seo_tags'
].join(', ');

function loadEnvFiles() {
  for (const name of ['.env', '.env.local']) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split(/\n/)) {
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

function loadTextRules(): SeoTagTextRulesFile {
  const raw = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8')) as Record<
    string,
    unknown
  >;
  const tags = raw.tags;
  if (!tags || typeof tags !== 'object') {
    throw new Error('seo-tag-text-rules.json: missing "tags" object');
  }
  return {
    defaultFields: Array.isArray(raw.defaultFields)
      ? (raw.defaultFields as string[])
      : undefined,
    tags: tags as SeoTagTextRulesFile['tags']
  };
}

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    apply: argv.includes('--apply'),
    allRows: argv.includes('--all-rows')
  };
}

function assertWritableSupabaseKey(apply: boolean) {
  if (!apply) return;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (!key) {
    throw new Error(
      'Backfill apply requires SUPABASE_SERVICE_ROLE_KEY. Publishable/anon keys are read-only for this workflow.'
    );
  }
  if (key.startsWith('sb_publishable_')) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is configured with a publishable key. Use a real service-role key before running --apply.'
    );
  }
}

function arraysEqualAsSets(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

type RowDb = SeoTagSourceRow & {
  id: string;
  slug: string | null;
  is_active: boolean | null;
  seo_tags: string[];
};

async function main() {
  loadEnvFiles();
  const { apply, allRows } = parseArgs();
  assertWritableSupabaseKey(apply);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
    process.exit(1);
  }

  const textRules = loadTextRules();
  const supabase = createClient<Database>(url, key);

  const tagCounts = new Map<string, number>();
  let scanned = 0;
  let withAnyTag = 0;
  let withNoTags = 0;
  const samples = new Map<SeoCanonicalTag, RowDb[]>();
  for (const t of SAMPLE_TAGS) samples.set(t, []);

  const pendingUpdates: { id: string; seo_tags: string[] }[] = [];

  let from = 0;
  for (;;) {
    let q = supabase
      .from('scholarships')
      .select(SELECT_COLUMNS)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (!allRows) {
      q = q.eq('is_active', true);
    }

    const { data, error } = await q;
    if (error) {
      console.error('Supabase query error:', error.message);
      if (
        error.message.includes('seo_tags') ||
        error.message.includes('column')
      ) {
        console.error(
          'Hint: apply migration supabase/migrations/20260420120000_scholarships_seo_tags.sql first.'
        );
      }
      process.exit(1);
    }

    const rows = (data ?? []) as RowDb[];
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned += 1;
      const source: SeoTagSourceRow = {
        title: row.title,
        summary_short: row.summary_short,
        description: row.description,
        requirements_text: row.requirements_text,
        eligibility_text: row.eligibility_text,
        eligibility_tags: row.eligibility_tags,
        catalog_education_levels: row.catalog_education_levels,
        gpa_bucket: row.gpa_bucket,
        easy_apply_flags: row.easy_apply_flags,
        field_of_study: row.field_of_study,
        study_levels: row.study_levels,
        payout_method: row.payout_method,
        award_amount_numeric_sort: row.award_amount_numeric_sort,
        deadline_bucket: row.deadline_bucket,
        is_verified: row.is_verified,
        financial_need_considered: row.financial_need_considered,
        citizenship_statuses: row.citizenship_statuses
      };

      const derived = deriveSeoTagsFromRow(source, textRules);
      const current = Array.isArray(row.seo_tags) ? row.seo_tags : [];

      if (derived.length === 0) {
        withNoTags += 1;
      } else {
        withAnyTag += 1;
      }

      for (const t of derived) {
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      }

      for (const t of SAMPLE_TAGS) {
        const bucket = samples.get(t)!;
        if (bucket.length >= SAMPLE_LIMIT) continue;
        if (derived.includes(t)) {
          bucket.push(row);
        }
      }

      if (apply && !arraysEqualAsSets(derived, current)) {
        pendingUpdates.push({ id: row.id, seo_tags: derived });
      }
    }

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const mode = apply ? 'APPLY' : 'DRY RUN';
  console.log(`=== seo_tags backfill (${mode}) ===\n`);
  console.log(`scanned rows: ${scanned}`);
  console.log(`rows with >= 1 derived tag: ${withAnyTag}`);
  console.log(`rows with 0 derived tags: ${withNoTags}`);
  if (!allRows) {
    console.log('(filter: is_active = true only; use --all-rows for every row)\n');
  } else {
    console.log('');
  }

  console.log('--- tag -> row count (rows where tag appears in derived set) ---');
  const sortedTags = [...tagCounts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  for (const [tag, c] of sortedTags) {
    console.log(`  ${tag}: ${c}`);
  }
  if (sortedTags.length === 0) {
    console.log('  (none)');
  }
  console.log('');

  console.log('--- sample rows (by tag, max ' + SAMPLE_LIMIT + ' each) ---');
  for (const t of SAMPLE_TAGS) {
    const list = samples.get(t) ?? [];
    console.log(`\n[${t}] (${list.length} samples)`);
    for (const r of list) {
      const title = (r.title ?? '').slice(0, 100);
      console.log(`  id=${r.id} slug=${r.slug ?? ''}`);
      console.log(`    title: ${title}${(r.title?.length ?? 0) > 100 ? '…' : ''}`);
    }
    if (list.length === 0) {
      console.log('  (no rows in this scan)');
    }
  }

  if (apply) {
    console.log('\n--- applying updates ---');
    console.log(`rows to update (differs from current seo_tags): ${pendingUpdates.length}`);
    const BATCH = 40;
    let ok = 0;
    let fail = 0;
    const updatedRows: Array<{ id: string; slug?: string | null }> = [];
    for (let i = 0; i < pendingUpdates.length; i += BATCH) {
      const chunk = pendingUpdates.slice(i, i + BATCH);
      const results = await Promise.all(
        chunk.map(({ id, slug, seo_tags }) =>
          supabase
            .from('scholarships')
            .update({ seo_tags })
            .eq('id', id)
            .select('id, slug')
            .maybeSingle()
            .then((result) => ({ ...result, inputId: id, inputSlug: slug }))
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
    console.log(`update calls succeeded: ${ok}, failed batches/calls: ${fail}`);
    if (updatedRows.length > 0) {
      const queue = await enqueueScholarshipUrlsForScript(
        updatedRows,
        'script:backfill-scholarship-seo-tags'
      );
      console.log(
        `google indexing queue: +${queue.enqueued} scholarship URL(s), total queued ${queue.total}`
      );
    }
    const verifyRow = pendingUpdates[0];
    if (verifyRow) {
      const { data, error } = await supabase
        .from('scholarships')
        .select('id, seo_tags')
        .eq('id', verifyRow.id)
        .maybeSingle();
      if (error) {
        throw new Error(`Post-write verification failed: ${error.message}`);
      }
      const persisted = Array.isArray(data?.seo_tags) ? data.seo_tags : [];
      if (!arraysEqualAsSets(persisted, verifyRow.seo_tags)) {
        throw new Error(
          'Post-write verification failed: seo_tags did not persist. Check service-role credentials and RLS.'
        );
      }
    }
  } else {
    console.log('\n(No DB writes; pass --apply after reviewing this report.)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
