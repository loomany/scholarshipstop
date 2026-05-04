/**
 * Fill missing host_country_codes from the same provider when that provider has
 * exactly one known host country across active scholarships.
 *
 * Output is compatible with scripts/update_hosts_in_db.ts.
 *
 *   dotenv -e .env.local -- npx tsx scripts/propagate_provider_single_host.ts
 */

import { writeFile } from 'fs/promises';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

const OUT_JSON = 'classified_hosts_provider_single_result.json';

type Row = {
  id: string;
  provider_slug: string | null;
  provider_name: string | null;
  host_country_codes: unknown;
  is_active: boolean | null;
};

type ResultRow = {
  id: string;
  provider_name: string | null;
  proposed_host_country: string | null;
  method: 'LocalDomain' | 'LocalDomainOnly';
  reason?: string;
};

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(url, key);
}

function isIso(code: unknown): code is string {
  return typeof code === 'string' && /^[A-Z]{2}$/.test(code.trim().toUpperCase());
}

function hostCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter(isIso)
        .map((code) => code.trim().toUpperCase())
    )
  ).sort();
}

function providerKey(row: Row): string | null {
  return row.provider_slug?.trim() || row.provider_name?.trim() || null;
}

async function main() {
  const supabase = serviceSupabase();
  const rows: Row[] = [];
  const pageSize = 200;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships_safe_listing')
      .select('id,provider_slug,provider_name,host_country_codes,is_active')
      .eq('is_active', true)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  const groups = new Map<string, { missing: Row[]; hosts: Set<string> }>();
  for (const row of rows) {
    const key = providerKey(row);
    if (!key) continue;
    const group = groups.get(key) ?? { missing: [], hosts: new Set<string>() };
    const hosts = hostCodes(row.host_country_codes);
    if (hosts.length === 0) {
      group.missing.push(row);
    } else {
      for (const host of hosts) group.hosts.add(host);
    }
    groups.set(key, group);
  }

  const results: ResultRow[] = [];
  for (const [key, group] of groups) {
    if (group.missing.length === 0 || group.hosts.size !== 1) continue;
    const host = Array.from(group.hosts)[0]!;
    for (const row of group.missing) {
      results.push({
        id: row.id,
        provider_name: row.provider_name,
        proposed_host_country: host,
        method: 'LocalDomain',
        reason: `single_provider_host:${key}`
      });
    }
  }

  await writeFile(OUT_JSON, JSON.stringify(results, null, 2), 'utf-8');
  const byCountry = results.reduce<Record<string, number>>((acc, row) => {
    const iso = row.proposed_host_country ?? 'null';
    acc[iso] = (acc[iso] ?? 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({ total: results.length, byCountry }, null, 2));
  console.log(`Wrote ${OUT_JSON}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
