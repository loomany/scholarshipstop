/**
 * Deterministic high-confidence host inference for rows still missing host_country_codes.
 *
 * Produces:
 * - remaining_hostless_audit.json — grouped reasons/signals for review
 * - classified_hosts_rules_remaining_result.json — compatible with update_hosts_in_db.ts
 *
 *   dotenv -e .env.local -- npx tsx scripts/infer_remaining_hosts_rules.ts
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

type HostlessRow = {
  id: string;
  title: string | null;
  provider_name: string | null;
  provider_slug: string | null;
  provider_url: string | null;
  apply_url: string | null;
  url: string | null;
  official_source_name: string | null;
  summary_short: string | null;
  description: string | null;
  eligibility_text: string | null;
  requirements_text: string | null;
  institutions_text: string | null;
  state_territory_text: string | null;
  state_codes: unknown;
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

type HipoEntry = {
  alpha_two_code?: string;
  domains?: unknown;
};

const RESULT_JSON = 'classified_hosts_rules_remaining_result.json';
const AUDIT_JSON = 'remaining_hostless_audit.json';
const ISO_RE = /^[A-Z]{2}$/;

const US_STATES = [
  'alabama',
  'alaska',
  'arizona',
  'arkansas',
  'california',
  'colorado',
  'connecticut',
  'delaware',
  'district of columbia',
  'florida',
  'georgia',
  'hawaii',
  'idaho',
  'illinois',
  'indiana',
  'iowa',
  'kansas',
  'kentucky',
  'louisiana',
  'maine',
  'maryland',
  'massachusetts',
  'michigan',
  'minnesota',
  'mississippi',
  'missouri',
  'montana',
  'nebraska',
  'nevada',
  'new hampshire',
  'new jersey',
  'new mexico',
  'new york',
  'north carolina',
  'north dakota',
  'ohio',
  'oklahoma',
  'oregon',
  'pennsylvania',
  'rhode island',
  'south carolina',
  'south dakota',
  'tennessee',
  'texas',
  'utah',
  'vermont',
  'virginia',
  'washington',
  'west virginia',
  'wisconsin',
  'wyoming'
];

const US_STATE_ABBREVIATIONS = new Set([
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'DC',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY'
]);

const COUNTRY_TLD_TO_ISO: Record<string, string> = {
  ac: 'SH',
  ad: 'AD',
  ae: 'AE',
  af: 'AF',
  ag: 'AG',
  ai: 'AI',
  al: 'AL',
  am: 'AM',
  ao: 'AO',
  ar: 'AR',
  at: 'AT',
  au: 'AU',
  az: 'AZ',
  ba: 'BA',
  bd: 'BD',
  be: 'BE',
  bg: 'BG',
  bh: 'BH',
  bm: 'BM',
  bn: 'BN',
  br: 'BR',
  bs: 'BS',
  bt: 'BT',
  bw: 'BW',
  by: 'BY',
  bz: 'BZ',
  ca: 'CA',
  ch: 'CH',
  cl: 'CL',
  cn: 'CN',
  co: 'CO',
  cr: 'CR',
  cy: 'CY',
  cz: 'CZ',
  de: 'DE',
  dk: 'DK',
  do: 'DO',
  dz: 'DZ',
  ec: 'EC',
  ee: 'EE',
  eg: 'EG',
  es: 'ES',
  fi: 'FI',
  fj: 'FJ',
  fr: 'FR',
  gb: 'GB',
  ge: 'GE',
  gh: 'GH',
  gr: 'GR',
  hk: 'HK',
  hr: 'HR',
  hu: 'HU',
  id: 'ID',
  ie: 'IE',
  il: 'IL',
  in: 'IN',
  ir: 'IR',
  is: 'IS',
  it: 'IT',
  jm: 'JM',
  jo: 'JO',
  jp: 'JP',
  ke: 'KE',
  kr: 'KR',
  kw: 'KW',
  kz: 'KZ',
  lb: 'LB',
  lk: 'LK',
  lt: 'LT',
  lu: 'LU',
  lv: 'LV',
  ma: 'MA',
  md: 'MD',
  me: 'ME',
  mk: 'MK',
  mt: 'MT',
  mx: 'MX',
  my: 'MY',
  ng: 'NG',
  nl: 'NL',
  no: 'NO',
  np: 'NP',
  nz: 'NZ',
  om: 'OM',
  pe: 'PE',
  ph: 'PH',
  pk: 'PK',
  pl: 'PL',
  pt: 'PT',
  qa: 'QA',
  ro: 'RO',
  rs: 'RS',
  ru: 'RU',
  sa: 'SA',
  se: 'SE',
  sg: 'SG',
  si: 'SI',
  sk: 'SK',
  th: 'TH',
  tr: 'TR',
  tw: 'TW',
  tz: 'TZ',
  ua: 'UA',
  uk: 'GB',
  us: 'US',
  uy: 'UY',
  vn: 'VN',
  za: 'ZA',
  zw: 'ZW'
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
  return ISO_RE.test(iso) ? iso : null;
}

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function hasValidHost(value: unknown): boolean {
  return jsonStringArray(value).some((code) => normalizeIso(code));
}

function hostnameFromUrl(raw: string | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

function buildHipoDomainMap(dataset: HipoEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of dataset) {
    const iso = normalizeIso(row.alpha_two_code);
    if (!iso || !Array.isArray(row.domains)) continue;
    for (const domain of row.domains) {
      if (typeof domain !== 'string') continue;
      const normalized = domain.trim().toLowerCase();
      if (normalized && !map.has(normalized)) map.set(normalized, iso);
    }
  }
  return map;
}

function hipoCountryForHost(map: Map<string, string>, host: string | null): string | null {
  if (!host) return null;
  const parts = host.split('.').filter(Boolean);
  for (let i = 0; i < parts.length - 1; i += 1) {
    const suffix = parts.slice(i).join('.');
    const hit = map.get(suffix);
    if (hit) return hit;
  }
  return null;
}

function countryFromTld(host: string | null): string | null {
  if (!host) return null;
  if (host.endsWith('.edu') || host.endsWith('.gov') || host.endsWith('.mil')) return 'US';
  const tld = host.split('.').pop()?.toLowerCase();
  if (!tld) return null;
  return COUNTRY_TLD_TO_ISO[tld] ?? null;
}

function textHasUsState(text: string): boolean {
  const lower = text.toLowerCase();
  if (US_STATES.some((state) => new RegExp(`\\b${state}\\b`, 'i').test(lower))) return true;
  return Array.from(US_STATE_ABBREVIATIONS).some((abbr) =>
    new RegExp(`\\b${abbr}\\b`).test(text)
  );
}

function joinedLocationText(row: HostlessRow): string {
  return [
    row.state_territory_text,
    row.institutions_text,
    row.eligibility_text,
    row.requirements_text,
    row.summary_short,
    row.title
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join('\n')
    .slice(0, 5000);
}

function inferRow(row: HostlessRow, hipoMap: Map<string, string>): ResultRow {
  const stateCodes = jsonStringArray(row.state_codes)
    .map((code) => code.trim().toUpperCase())
    .filter((code) => US_STATE_ABBREVIATIONS.has(code));
  if (stateCodes.length > 0) {
    return { id: row.id, provider_name: row.provider_name, proposed_host_country: 'US', method: 'LocalDomain', reason: 'state_codes' };
  }

  const urls = [row.provider_url, row.apply_url, row.url];
  for (const rawUrl of urls) {
    const host = hostnameFromUrl(rawUrl);
    const hipo = hipoCountryForHost(hipoMap, host);
    if (hipo) {
      return { id: row.id, provider_name: row.provider_name, proposed_host_country: hipo, method: 'LocalDomain', reason: `hipo_domain:${host}` };
    }
  }

  for (const rawUrl of urls) {
    const host = hostnameFromUrl(rawUrl);
    const tldIso = countryFromTld(host);
    if (tldIso) {
      return { id: row.id, provider_name: row.provider_name, proposed_host_country: tldIso, method: 'LocalDomain', reason: `domain_tld:${host}` };
    }
  }

  const locationText = joinedLocationText(row);
  if (textHasUsState(locationText)) {
    return { id: row.id, provider_name: row.provider_name, proposed_host_country: 'US', method: 'LocalDomain', reason: 'us_state_text' };
  }

  return { id: row.id, provider_name: row.provider_name, proposed_host_country: null, method: 'LocalDomainOnly', reason: 'no_rule_match' };
}

async function main() {
  const supabase = serviceSupabase();
  const hipoPath = join(process.cwd(), 'scripts', 'data', 'world_universities_and_domains.json');
  const hipoMap = buildHipoDomainMap(JSON.parse(await readFile(hipoPath, 'utf-8')) as HipoEntry[]);

  const rows: HostlessRow[] = [];
  const pageSize = 500;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(
        [
          'id',
          'title',
          'provider_name',
          'provider_slug',
          'provider_url',
          'apply_url',
          'url',
          'official_source_name',
          'summary_short',
          'description',
          'eligibility_text',
          'requirements_text',
          'institutions_text',
          'state_territory_text',
          'state_codes',
          'host_country_codes',
          'is_active'
        ].join(',')
      )
      .eq('is_active', true)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    for (const row of (data ?? []) as HostlessRow[]) {
      if (!hasValidHost(row.host_country_codes)) rows.push(row);
    }
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  const results = rows.map((row) => inferRow(row, hipoMap));
  const valid = results.filter((row) => row.proposed_host_country);
  const reasonCounts = results.reduce<Record<string, number>>((acc, row) => {
    acc[row.reason ?? 'unknown'] = (acc[row.reason ?? 'unknown'] ?? 0) + 1;
    return acc;
  }, {});
  const countryCounts = valid.reduce<Record<string, number>>((acc, row) => {
    const iso = row.proposed_host_country!;
    acc[iso] = (acc[iso] ?? 0) + 1;
    return acc;
  }, {});

  await writeFile(RESULT_JSON, JSON.stringify(results, null, 2), 'utf-8');
  await writeFile(
    AUDIT_JSON,
    JSON.stringify(
      {
        total_hostless_rows: rows.length,
        proposed_count: valid.length,
        null_count: rows.length - valid.length,
        reasonCounts,
        countryCounts,
        proposed_examples: valid.slice(0, 100).map((row) => ({
          id: row.id,
          provider_name: row.provider_name,
          proposed_host_country: row.proposed_host_country,
          reason: row.reason
        })),
        null_examples: results
          .filter((row) => !row.proposed_host_country)
          .slice(0, 100)
          .map((row) => ({ id: row.id, provider_name: row.provider_name, reason: row.reason }))
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(JSON.stringify({ total: rows.length, proposed: valid.length, nulls: rows.length - valid.length, reasonCounts, countryCounts }, null, 2));
  console.log(`Wrote ${RESULT_JSON}`);
  console.log(`Wrote ${AUDIT_JSON}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
