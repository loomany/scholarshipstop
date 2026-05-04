/**
 * Remove overlaps between host_country_codes and applicant_country_codes.
 *
 * Host country is where the program/provider is based; applicant country is who is
 * eligible. When the same ISO appears in both, keep host and remove it from applicant.
 *
 *   dotenv -e .env.local -- npx tsx scripts/clean_host_applicant_country_overlaps.ts
 *   dotenv -e .env.local -- npx tsx scripts/clean_host_applicant_country_overlaps.ts --write
 */

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

type Row = {
  id: string;
  host_country_codes: unknown;
  applicant_country_codes: unknown;
};

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(url, key);
}

function isoCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().toUpperCase())
        .filter((item) => /^[A-Z]{2}$/.test(item))
    )
  ).sort();
}

async function main() {
  const write = hasFlag('--write');
  const supabase = serviceSupabase();
  const rows: Row[] = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select('id,host_country_codes,applicant_country_codes')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  const updates = rows
    .map((row) => {
      const host = isoCodes(row.host_country_codes);
      const applicant = isoCodes(row.applicant_country_codes);
      if (host.length === 0 || applicant.length === 0) return null;
      const hostSet = new Set(host);
      const nextApplicant = applicant.filter((code) => !hostSet.has(code));
      if (nextApplicant.length === applicant.length) return null;
      return {
        id: row.id,
        host,
        beforeApplicant: applicant,
        nextApplicant,
        removed: applicant.filter((code) => hostSet.has(code))
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  console.log(
    JSON.stringify(
      {
        mode: write ? 'write' : 'dry-run',
        scanned: rows.length,
        overlap_rows: updates.length,
        removed_iso_count: updates.reduce((sum, row) => sum + row.removed.length, 0),
        examples: updates.slice(0, 20)
      },
      null,
      2
    )
  );

  if (!write || updates.length === 0) return;

  let ok = 0;
  let fail = 0;
  for (const update of updates) {
    const { error } = await supabase
      .from('scholarships')
      .update({ applicant_country_codes: update.nextApplicant })
      .eq('id', update.id);
    if (error) {
      fail += 1;
      console.warn(`Failed ${update.id}: ${error.message}`);
    } else {
      ok += 1;
    }
  }

  console.log(JSON.stringify({ ok, fail }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
