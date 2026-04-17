/**
 * Backfill `scholarships.state_codes` (JSON array of USPS codes) from catalog
 * `locationLabels` + provider-related text. SEO exact-match uses `stateCodes`,
 * not only derived sidebar labels.
 *
 * Default: dry-run — prints how many rows would change; no DB writes.
 *
 *   npx tsx scripts/backfill-state-codes.ts
 *   npx tsx scripts/backfill-state-codes.ts --verbose
 *   npx tsx scripts/backfill-state-codes.ts --all-rows
 *   npx tsx scripts/backfill-state-codes.ts --apply   # writes (requires service role)
 */

import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';

import type { Scholarship } from '../app/scholarships/scholarshipsData';
import {
  US_STATE_CODE_TO_NAME,
  US_STATE_NAME_TO_CODE,
  normalizeUsStateToCanonical
} from '../lib/constants/usStates';
import {
  catalogLocationLabelsToStateCodes,
  getScholarshipCatalog
} from '../lib/scholarships/scholarshipCatalog';
import {
  ACTIVE_CATALOG_SELECT,
  fetchActiveScholarshipsForScript,
  mapScholarshipRow,
  type ScholarshipRow
} from '../lib/scholarships/supabase';
import { enqueueScholarshipUrlsForScript } from './lib/googleIndexing';
import type { Database } from '../types_db';

const ROOT = path.resolve(__dirname, '..');
const PAGE_SIZE = 500;

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
  return {
    apply: argv.includes('--apply'),
    allRows: argv.includes('--all-rows'),
    verbose: argv.includes('--verbose')
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** USPS codes mentioned as full names or 2-letter tokens (word-bounded). */
function extractStateCodesFromPlainText(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  const lower = t.toLowerCase();
  const upper = t.toUpperCase();
  const out = new Set<string>();

  for (const name of Object.keys(US_STATE_NAME_TO_CODE)) {
    const re = new RegExp(`\\b${escapeRegex(name)}\\b`, 'i');
    if (re.test(lower)) {
      out.add(US_STATE_NAME_TO_CODE[name]!);
    }
  }

  for (const code of Object.keys(US_STATE_CODE_TO_NAME)) {
    const re = new RegExp(`\\b${code}\\b`);
    if (re.test(upper)) out.add(code);
  }

  if (/\b(?:District\s+of\s+Columbia|Washington\s*,?\s*DC)\b/i.test(t)) {
    out.add('DC');
  }

  return [...out];
}

function normalizeStateCodeList(codes: string[] | undefined): string[] {
  const u = new Set<string>();
  for (const c of codes ?? []) {
    const x = c.trim().toUpperCase();
    if (x) u.add(x);
  }
  return Array.from(u).sort();
}

function stateCodesFromLocationLabels(labels: readonly string[]): string[] {
  const fromNames = catalogLocationLabelsToStateCodes(new Set(labels));
  const out = new Set(fromNames);

  for (const lab of labels) {
    const s = lab.trim();
    if (/^[a-z]{2}$/i.test(s)) {
      const code = s.toUpperCase();
      if (US_STATE_CODE_TO_NAME[code]) out.add(code);
    }
    const canon = normalizeUsStateToCanonical(s);
    if (canon && US_STATE_NAME_TO_CODE[canon]) {
      out.add(US_STATE_NAME_TO_CODE[canon]!);
    }
  }

  return Array.from(out);
}

function providerAndAddressBlob(s: Scholarship): string {
  return [
    s.provider,
    s.providerMission,
    s.stateTerritoryText,
    s.officialSourceName,
    s.supportPhone
  ]
    .filter(Boolean)
    .join(' ');
}

function proposedStateCodes(s: Scholarship): string[] {
  const cat = getScholarshipCatalog(s);
  const fromLabels = stateCodesFromLocationLabels(cat.locationLabels);
  const fromProvider = extractStateCodesFromPlainText(providerAndAddressBlob(s));

  const merged = new Set([
    ...normalizeStateCodeList(s.stateCodes),
    ...fromLabels,
    ...fromProvider
  ]);
  return Array.from(merged).sort();
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

async function loadScholarships(allRows: boolean): Promise<Scholarship[]> {
  if (!allRows) {
    return fetchActiveScholarshipsForScript();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and a Supabase key for --all-rows'
    );
  }

  const supabase = createClient<Database>(url, key);
  const rows: ScholarshipRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(ACTIVE_CATALOG_SELECT)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as unknown as ScholarshipRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows.map((r) => mapScholarshipRow(r));
}

async function main() {
  loadEnvFiles();
  const { apply, allRows, verbose } = parseArgs();
  assertWritableSupabaseKey(apply);

  const list = await loadScholarships(allRows);

  const pending: { id: string; state_codes: string[] }[] = [];
  const samples: { id: string; slug: string; before: string[]; after: string[] }[] = [];

  for (const s of list) {
    const current = normalizeStateCodeList(s.stateCodes);
    const next = proposedStateCodes(s);
    if (!arraysEqual(current, next)) {
      pending.push({ id: s.id, state_codes: next });
      if (verbose && samples.length < 8) {
        samples.push({
          id: s.id,
          slug: s.slug ?? '',
          before: current,
          after: next
        });
      }
    }
  }

  console.log(
    `Будет обновлено ${pending.length} грантов (всего в выборке: ${list.length}).`
  );
  if (!allRows) {
    console.log(
      '(только is_active = true; для всех строк: --all-rows)\n'
    );
  } else {
    console.log('');
  }

  if (verbose && samples.length > 0) {
    console.log('--- примеры (до → после) ---');
    for (const x of samples) {
      console.log(`  id=${x.id} slug=${x.slug}`);
      console.log(`    было:  ${JSON.stringify(x.before)}`);
      console.log(`    станет: ${JSON.stringify(x.after)}`);
    }
    console.log('');
  }

  if (!apply) {
    console.log('Запись в БД отключена. Для применения: npx tsx scripts/backfill-state-codes.ts --apply');
    if (allRows) {
      console.log('(с теми же флагами, что и при просмотре, например --all-rows)');
    }
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient<Database>(url, key);
  const BATCH = 40;
  let ok = 0;
  let fail = 0;
  const updatedRows: Array<{ id: string; slug?: string | null }> = [];

  console.log(`\n--- applying ${pending.length} updates ---`);
  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map(({ id, slug, state_codes }) =>
        supabase
          .from('scholarships')
          .update({ state_codes })
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
  console.log(`update calls: ${ok} ok, ${fail} failed`);
  if (updatedRows.length > 0) {
    const queue = await enqueueScholarshipUrlsForScript(
      updatedRows,
      'script:backfill-state-codes'
    );
    console.log(
      `google indexing queue: +${queue.enqueued} scholarship URL(s), total queued ${queue.total}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
