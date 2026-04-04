/**
 * Populate `scholarship_categories` from mapping rules (field_of_study, keywords, seo_tags subject, legacy slug).
 *
 *   npx tsx scripts/backfill-scholarship-subject-categories.ts              # dry-run
 *   npx tsx scripts/backfill-scholarship-subject-categories.ts --apply    # writes (service role)
 *
 * Optional:
 *   --all-rows   include is_active = false (default: active only)
 *
 * Requires: migration `20260421130000_scholarship_subject_categories.sql`
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (for --apply)
 */

import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';

import {
  assignSubjectCategories,
  type SubjectCategoryRowInput
} from '../lib/scholarships/categories/assignSubjectCategories';
import type { Database } from '../types_db';

type ScholarshipCategoryInsert =
  Database['public']['Tables']['scholarship_categories']['Insert'];

const ROOT = path.resolve(__dirname, '..');
const PAGE_SIZE = 400;
const INSERT_CHUNK = 300;

const SELECT_COLUMNS = [
  'id',
  'category',
  'category_slug',
  'tags',
  'field_of_study',
  'title',
  'description',
  'summary_short',
  'requirements_text',
  'eligibility_text',
  'seo_tags',
  'is_active'
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

type L2CountMap = Map<string, number>;
type RowPlan = ScholarshipCategoryInsert;

function main() {
  loadEnvFiles();
  const args = new Set(process.argv.slice(2));
  const apply = args.has('--apply');
  const allRows = args.has('--all-rows');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = apply
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and key (use SUPABASE_SERVICE_ROLE_KEY for --apply).'
    );
    process.exit(1);
  }

  void run({ url, key, apply, allRows });
}

async function run(opts: {
  url: string;
  key: string;
  apply: boolean;
  allRows: boolean;
}) {
  const { url, key, apply, allRows } = opts;
  const supabase = createClient<Database>(url, key);

  const { data: catRows, error: catErr } = await supabase
    .from('categories')
    .select('id,slug,level')
    .eq('level', 2);

  if (catErr || !catRows?.length) {
    console.error(
      'Failed to load L2 categories. Apply migration 20260421130000_scholarship_subject_categories.sql first.',
      catErr?.message
    );
    process.exit(1);
  }

  const slugToId = new Map<string, string>();
  for (const r of catRows as { id: string; slug: string }[]) {
    slugToId.set(r.slug, r.id);
  }

  const openSubjectId = slugToId.get('open_subject');
  if (!openSubjectId) {
    console.error(
      'Seed row slug=open_subject missing. Run migration 20260422120000_rename_uncategorized_to_open_subject.sql (or fresh seed).'
    );
    process.exit(1);
  }

  const l2Counts: L2CountMap = new Map();
  /** How often each L2 is the primary (first) category for a row. */
  const primaryCounts: L2CountMap = new Map();
  let rowsScanned = 0;
  let multiL2 = 0;
  let fallbackOnly = 0;
  const samplesByL2 = new Map<string, string[]>();
  /** Up to 50 unique titles per L2 when that L2 is primary (diagnostics). */
  const primaryTitleSamples = new Map<string, string[]>();

  const plans: RowPlan[] = [];
  const touchedIds: string[] = [];

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

    const { data: page, error } = await q;
    if (error) {
      console.error('scholarships page error', error.message);
      process.exit(1);
    }
    if (!page?.length) break;

    for (const raw of page) {
      rowsScanned += 1;
      const row = raw as SubjectCategoryRowInput & { id: string; is_active: boolean | null };
      const { l2Slugs, primaryL2Slug, hits } = assignSubjectCategories(row);

      if (l2Slugs.length > 1) multiL2 += 1;
      if (hits.length === 1 && hits[0].source === 'fallback') fallbackOnly += 1;

      for (const slug of l2Slugs) {
        l2Counts.set(slug, (l2Counts.get(slug) ?? 0) + 1);
      }

      primaryCounts.set(
        primaryL2Slug,
        (primaryCounts.get(primaryL2Slug) ?? 0) + 1
      );

      const addSample = (slug: string, title: string) => {
        const arr = samplesByL2.get(slug) ?? [];
        if (arr.length < 2) {
          arr.push(title.slice(0, 80));
          samplesByL2.set(slug, arr);
        }
      };

      for (const slug of l2Slugs) {
        addSample(slug, row.title ?? row.id);
      }

      const titleLine = (row.title ?? row.id).trim() || row.id;
      const pt = primaryTitleSamples.get(primaryL2Slug) ?? [];
      if (pt.length < 50 && !pt.includes(titleLine)) {
        pt.push(titleLine.slice(0, 160));
        primaryTitleSamples.set(primaryL2Slug, pt);
      }

      touchedIds.push(row.id);

      for (const slug of l2Slugs) {
        const category_id = slugToId.get(slug) ?? openSubjectId;
        plans.push({
          scholarship_id: row.id,
          category_id,
          is_primary: slug === primaryL2Slug,
          source: hits.find((h) => h.l2Slug === slug)?.source ?? null
        });
      }
    }

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log('\n=== subject category backfill (dry-run summary) ===\n');
  console.log('rows scanned:', rowsScanned);
  console.log('scholarships with 2+ L2:', multiL2);
  console.log('fallback-only assignments:', fallbackOnly);

  const pc = (slug: string) => primaryCounts.get(slug) ?? 0;
  console.log('\nprimary L2 counts (headline metrics):');
  console.log(
    `  open_subject: ${pc('open_subject')} | stem_general: ${pc('stem_general')} | community_nonprofit: ${pc('community_nonprofit')}`
  );
  console.log(
    `  computer_science: ${pc('computer_science')} | engineering: ${pc('engineering')} | education_k12_higher: ${pc('education_k12_higher')} | interdisciplinary: ${pc('interdisciplinary')}`
  );

  console.log('\nper L2 (row-inclusion counts; sum > rows if multi-L2):');
  const sorted = [...l2Counts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [slug, n] of sorted) {
    const s = samplesByL2.get(slug)?.join(' | ') ?? '';
    console.log(`  ${n}\t${slug}\t${s ? `e.g. ${s}` : ''}`);
  }
  console.log('\nlink rows to upsert:', plans.length);

  function printPrimarySamples(slug: string) {
    const list = primaryTitleSamples.get(slug) ?? [];
    console.log(`\n--- up to 50 sample titles (primary = ${slug}) - ${list.length} collected ---`);
    list.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  }

  printPrimarySamples('open_subject');
  printPrimarySamples('stem_general');
  printPrimarySamples('community_nonprofit');

  if (!apply) {
    console.log(
      '\nDry-run only. Re-run with --apply and SUPABASE_SERVICE_ROLE_KEY to write scholarship_categories.\n'
    );
    return;
  }

  console.log('\nApplying: clearing existing links for affected scholarships…');

  for (let i = 0; i < touchedIds.length; i += INSERT_CHUNK) {
    const batch = touchedIds.slice(i, i + INSERT_CHUNK);
    const { error: delErr } = await supabase
      .from('scholarship_categories')
      .delete()
      .in('scholarship_id', batch);
    if (delErr) {
      console.error('delete batch failed', delErr.message);
      process.exit(1);
    }
  }

  for (let i = 0; i < plans.length; i += INSERT_CHUNK) {
    const chunk = plans.slice(i, i + INSERT_CHUNK);
    const { error: insErr } = await supabase
      .from('scholarship_categories')
      .insert(chunk);
    if (insErr) {
      console.error('insert batch failed', insErr.message);
      process.exit(1);
    }
  }

  console.log('Done. Inserted', plans.length, 'scholarship_categories rows.\n');
}

main();
