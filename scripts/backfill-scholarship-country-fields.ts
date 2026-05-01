/**
 * Backfill country eligibility fields for scholarship country discovery.
 *
 * Default: dry-run. Writes require --apply and SUPABASE_SERVICE_ROLE_KEY.
 *
 *   dotenv -e .env.local -- npx tsx scripts/backfill-scholarship-country-fields.ts
 *   dotenv -e .env.local -- npx tsx scripts/backfill-scholarship-country-fields.ts --apply
 *   dotenv -e .env.local -- npx tsx scripts/backfill-scholarship-country-fields.ts --limit=200 --verbose
 */

import { createClient } from '@supabase/supabase-js';

import { parseScholarshipCountryEligibility } from '../lib/scholarships/countryEligibility/parseScholarshipCountryEligibility';
import { countryLabelFromCode } from '../lib/scholarships/countryEligibility/countries';
import type { Database } from '../types_db';

type Row = Pick<
  Database['public']['Tables']['scholarships']['Row'],
  | 'id'
  | 'slug'
  | 'title'
  | 'provider_name'
  | 'source'
  | 'state_territory_text'
  | 'eligibility_text'
  | 'requirements_text'
  | 'description'
  | 'summary_short'
  | 'summary_long'
  | 'raw_data'
  | 'applicant_country_codes'
  | 'host_country_codes'
  | 'country_eligibility_notes'
>;

const PAGE_SIZE = 500;

function parseArgs() {
  const argv = process.argv.slice(2);
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number.parseInt(limitArg.slice('--limit='.length), 10) : null;
  return {
    apply: argv.includes('--apply'),
    verbose: argv.includes('--verbose'),
    allRows: argv.includes('--all-rows'),
    limit: limit != null && Number.isFinite(limit) && limit > 0 ? limit : null
  };
}

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function uniqSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const aa = [...a].sort();
  const bb = [...b].sort();
  return aa.every((value, index) => value === bb[index]);
}

function addCounts(map: Map<string, number>, codes: string[]) {
  for (const code of codes) map.set(code, (map.get(code) ?? 0) + 1);
}

async function main() {
  const { apply, verbose, allRows, limit } = parseArgs();
  if (apply && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error('--apply requires SUPABASE_SERVICE_ROLE_KEY');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and a Supabase key');

  const supabase = createClient<Database>(url, key);
  const pending: Array<{ id: string; slug: string | null; patch: Record<string, unknown> }> = [];
  const applicantCounts = new Map<string, number>();
  const hostCounts = new Map<string, number>();
  let scanned = 0;
  let from = 0;

  for (;;) {
    if (limit != null && scanned >= limit) break;
    let query = supabase
      .from('scholarships')
      .select(
        [
          'id',
          'slug',
          'title',
          'provider_name',
          'source',
          'state_territory_text',
          'eligibility_text',
          'requirements_text',
          'description',
          'summary_short',
          'summary_long',
          'raw_data',
          'applicant_country_codes',
          'host_country_codes',
          'country_eligibility_notes'
        ].join(',')
      )
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (!allRows) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Row[];
    if (rows.length === 0) break;

    for (const row of rows) {
      if (limit != null && scanned >= limit) break;
      scanned += 1;
      const parsed = parseScholarshipCountryEligibility({
        title: row.title,
        providerName: row.provider_name,
        source: row.source,
        stateTerritoryText: row.state_territory_text,
        eligibilityText: row.eligibility_text,
        requirementsText: row.requirements_text,
        description: row.description,
        summaryShort: row.summary_short,
        summaryLong: row.summary_long,
        rawData: row.raw_data
      });
      const existingApplicant = uniqSorted(jsonStringArray(row.applicant_country_codes));
      const existingHost = uniqSorted(jsonStringArray(row.host_country_codes));
      const nextApplicant = uniqSorted([
        ...existingApplicant,
        ...parsed.applicantCountryCodes
      ]);
      const nextHost = uniqSorted([...existingHost, ...parsed.hostCountryCodes]);
      addCounts(applicantCounts, nextApplicant);
      addCounts(hostCounts, nextHost);

      const patch: Record<string, unknown> = {};
      if (!arraysEqual(existingApplicant, nextApplicant)) {
        patch.applicant_country_codes = nextApplicant;
      }
      if (!arraysEqual(existingHost, nextHost)) {
        patch.host_country_codes = nextHost;
      }
      if (
        parsed.reasons.length > 0 &&
        jsonStringArray(row.country_eligibility_notes).length === 0
      ) {
        patch.country_eligibility_notes = parsed.reasons;
      }

      if (Object.keys(patch).length > 0) {
        pending.push({ id: row.id, slug: row.slug ?? null, patch });
        if (verbose && pending.length <= 12) {
          console.log('\n--- sample ---');
          console.log(`${row.title ?? '(untitled)'} ${row.slug ?? ''}`);
          console.log(patch);
        }
      }
    }

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`Scanned: ${scanned}`);
  console.log(`Would update: ${pending.length}`);
  console.log('\nTop applicant countries:');
  for (const [code, count] of [...applicantCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${countryLabelFromCode(code)} (${code})\t${count}`);
  }
  console.log('\nTop host countries:');
  for (const [code, count] of [...hostCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${countryLabelFromCode(code)} (${code})\t${count}`);
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to write country fields.');
    return;
  }

  for (const item of pending) {
    const { error } = await supabase
      .from('scholarships')
      .update(item.patch)
      .eq('id', item.id);
    if (error) throw new Error(`${item.slug ?? item.id}: ${error.message}`);
  }
  console.log(`Applied ${pending.length} update(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
