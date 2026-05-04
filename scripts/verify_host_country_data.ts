/**
 * Verify host-country data quality after parser imports / post-processing.
 *
 *   dotenv -e .env.local -- npx tsx scripts/verify_host_country_data.ts
 */

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(url, key);
}

function isIso(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{2}$/.test(value.trim().toUpperCase());
}

function isoCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter(isIso)
        .map((item) => item.trim().toUpperCase())
    )
  ).sort();
}

async function main() {
  const supabase = serviceSupabase();
  const { count: totalActiveRows, error: totalError } = await supabase
    .from('scholarships_safe_listing')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  if (totalError) throw totalError;

  const { count: rowsWithoutValidHost, error: missingError } = await supabase
    .from('scholarships_safe_listing')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('host_program_location_unspecified', true);
  if (missingError) throw missingError;

  const rows: Array<{
    id: string;
    provider_name: string | null;
    provider_slug: string | null;
    host_country_codes: unknown;
    applicant_country_codes: unknown;
  }> = [];

  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('scholarships')
      .select('id,provider_name,provider_slug,host_country_codes,applicant_country_codes')
      .eq('is_active', true)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as typeof rows));
    if (!data || data.length < pageSize) break;
  }

  let rowsWithValidHost = 0;
  let invalidHostTokenRows = 0;
  let hostApplicantOverlapRows = 0;
  let hostlessKnownProviderIdentity = 0;
  let hostlessMissingProviderIdentity = 0;

  for (const row of rows) {
    const rawHostCount = Array.isArray(row.host_country_codes)
      ? row.host_country_codes.filter((item) => typeof item === 'string' && item.trim()).length
      : 0;
    const hostCodes = isoCodes(row.host_country_codes);
    const applicantCodes = isoCodes(row.applicant_country_codes);
    if (hostCodes.length > 0) rowsWithValidHost += 1;
    if (rawHostCount > 0 && hostCodes.length === 0) invalidHostTokenRows += 1;
    if (hostCodes.some((code) => applicantCodes.includes(code))) hostApplicantOverlapRows += 1;
    if (hostCodes.length === 0) {
      const providerKey = row.provider_slug?.trim() || row.provider_name?.trim();
      if (providerKey) hostlessKnownProviderIdentity += 1;
      else hostlessMissingProviderIdentity += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        total_active_rows: totalActiveRows ?? rows.length,
        rows_with_valid_host: rowsWithValidHost,
        rows_without_valid_host: rowsWithoutValidHost ?? 0,
        invalid_host_token_rows: invalidHostTokenRows,
        host_applicant_overlap_rows: hostApplicantOverlapRows,
        hostless_known_provider_identity: hostlessKnownProviderIdentity,
        hostless_missing_provider_identity: hostlessMissingProviderIdentity
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
