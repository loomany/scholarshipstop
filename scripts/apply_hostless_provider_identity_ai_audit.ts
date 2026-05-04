/**
 * Apply high-confidence rows from hostless_provider_identity_ai_audit.json.
 *
 * Updates provider_name/provider_slug/host_country_codes and removes host overlap
 * from applicant_country_codes.
 *
 *   dotenv -e .env.local -- npx tsx scripts/apply_hostless_provider_identity_ai_audit.ts
 */

import { readFile } from 'fs/promises';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

const AUDIT_JSON = 'hostless_provider_identity_ai_audit.json';

type AuditRow = {
  id: string;
  provider_name: string | null;
  provider_slug: string | null;
  host_iso: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  should_apply: boolean;
};

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(url, key);
}

function normalizeIso(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const iso = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(iso) ? iso : null;
}

function applicantCodes(value: unknown): string[] {
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
  const parsed = JSON.parse(await readFile(AUDIT_JSON, 'utf-8')) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`Expected array in ${AUDIT_JSON}`);
  const rows = parsed
    .filter((row): row is AuditRow => {
      if (typeof row !== 'object' || row === null) return false;
      const r = row as AuditRow;
      return (
        typeof r.id === 'string' &&
        r.should_apply === true &&
        r.confidence === 'high' &&
        typeof r.provider_name === 'string' &&
        typeof r.provider_slug === 'string' &&
        normalizeIso(r.host_iso) != null
      );
    })
    .map((row) => ({
      id: row.id.trim(),
      provider_name: row.provider_name!.trim(),
      provider_slug: row.provider_slug!.trim(),
      host_iso: normalizeIso(row.host_iso)!
    }));

  console.log(`High-confidence rows to apply: ${rows.length.toLocaleString()}`);
  if (rows.length === 0) return;

  const supabase = serviceSupabase();
  let ok = 0;
  let fail = 0;
  let strippedApplicantOverlap = 0;
  for (const row of rows) {
    const { data, error: fetchError } = await supabase
      .from('scholarships')
      .select('id,applicant_country_codes')
      .eq('id', row.id)
      .single();
    if (fetchError) {
      fail += 1;
      console.warn(`Fetch failed ${row.id}: ${fetchError.message}`);
      continue;
    }
    const beforeApplicant = applicantCodes(data?.applicant_country_codes);
    const afterApplicant = beforeApplicant.filter((code) => code !== row.host_iso);
    if (afterApplicant.length !== beforeApplicant.length) strippedApplicantOverlap += 1;

    const { error } = await supabase
      .from('scholarships')
      .update({
        provider_name: row.provider_name,
        provider_slug: row.provider_slug,
        host_country_codes: [row.host_iso],
        applicant_country_codes: afterApplicant
      })
      .eq('id', row.id)
      .is('provider_name', null)
      .is('provider_slug', null);
    if (error) {
      fail += 1;
      console.warn(`Update failed ${row.id}: ${error.message}`);
    } else {
      ok += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok,
        fail,
        strippedApplicantOverlap
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
