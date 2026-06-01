import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createGunzip } from 'node:zlib';

type JsonObject = Record<string, unknown>;

type InputFileReportRow = {
  source_name: string;
  input_path: string;
  exists: boolean;
  format: string;
  size_mb: string;
  estimated_rows: string;
  read_method: string;
  will_use_now: string;
  reason: string;
};

type ProviderNonprofitRecord = {
  provider_key: string;
  name: string;
  normalized_name: string;
  ein?: string | null;
  city?: string | null;
  state?: string | null;
  ntee_code?: string | null;
  ntee_description?: string | null;
  organization_type?: string | null;
  ruling_year?: number | null;
  revenue_band?: string | null;
  assets_band?: string | null;
  has_recent_filing?: boolean | null;
  propublica_url?: string | null;
  usaspending_award_count?: number | null;
  usaspending_total_obligated?: number | null;
  source_years?: Record<string, string | number>;
  sources: string[];
};

type InstitutionResearchRecord = {
  institution_key: string;
  name: string;
  normalized_name: string;
  state?: string | null;
  unit_id?: string | null;
  opeid?: string | null;
  ror_id?: string | null;
  openalex_id?: string | null;
  homepage?: string | null;
  institution_type?: string | null;
  country?: string | null;
  works_count?: number | null;
  cited_by_count?: number | null;
  nih_project_count?: number | null;
  nih_total_funding_band?: string | null;
  nih_latest_year?: number | null;
  research_summary?: string | null;
  sources: string[];
};

type StateSocialContextRecord = {
  state_code: string;
  state_name: string;
  svi_context?: string | null;
  svi_percentile_band?: string | null;
  adi_context?: string | null;
  adi_percentile_band?: string | null;
  county_health_context?: string | null;
  counties_with_svi_data?: number | null;
  counties_with_adi_data?: number | null;
  counties_with_health_data?: number | null;
  source_years?: Record<string, string | number>;
  display_policy: {
    neutral_context_only: true;
    no_rankings: true;
    no_eligibility_claims: true;
  };
  sources: string[];
};

type Envelope<T> = {
  meta: {
    generated_at: string;
    generated_by: string;
    permission_status: string;
    output_policy: string;
  };
  records: T[];
};

const ROOT = process.cwd();
const PACKAGE_ROOT =
  'C:\\dev\\adek\\customer_package\\medresidency_data_package_2026-05-29';
const DATA_DIR = path.join(ROOT, 'data/external/scholarshiptop-enrichment');
const REPORT_DIR = path.join(ROOT, 'reports/data');
const PERMISSION_STATUS = 'permission_received_per_user_statement';

const PATHS = {
  propublica_nonprofit: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/02_local_normalized_sources/propublica_nonprofit/normalized/propublica_nonprofit.jsonl'
  ),
  usaspending: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/03_newly_collected_sources/usaspending_fy2025_thcgme_recipients/usaspending_fy2025_thcgme_recipients.jsonl'
  ),
  openalex: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/02_local_normalized_sources/openalex/normalized/openalex.jsonl'
  ),
  ror: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/01_legacy_supabase_exports/ror/ror.jsonl.gz'
  ),
  nih_reporter: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/03_newly_collected_sources/nih_reporter/normalized/nih_reporter.jsonl'
  ),
  college_scorecard: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/03_newly_collected_sources/college_scorecard/normalized/college_scorecard.jsonl'
  ),
  cdc_svi: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/01_legacy_supabase_exports/cdc_svi/cdc_svi.jsonl.gz'
  ),
  adi: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/02_local_normalized_sources/adi/normalized/adi.jsonl'
  ),
  county_health_rankings: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/01_legacy_supabase_exports/county_health_rankings/county_health_rankings.jsonl.gz'
  ),
  fbi_crime: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/02_local_normalized_sources/fbi_crime/normalized/fbi_crime.jsonl'
  ),
  census_acs: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/02_local_normalized_sources/census_acs/normalized/census_acs.jsonl'
  ),
  bls_metro: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/01_legacy_supabase_exports/bls_metro/bls_metro.jsonl.gz'
  ),
  zillow_zori: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/01_legacy_supabase_exports/zillow_zori/zillow_zori.jsonl.gz'
  )
} as const;

const STATE_CODE_TO_NAME: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  PR: 'Puerto Rico',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming'
};

const STATE_NAME_TO_CODE = Object.fromEntries(
  Object.entries(STATE_CODE_TO_NAME).map(([code, name]) => [name.toLowerCase(), code])
);

const STATE_FIPS_TO_CODE: Record<string, string> = {
  '01': 'AL',
  '02': 'AK',
  '04': 'AZ',
  '05': 'AR',
  '06': 'CA',
  '08': 'CO',
  '09': 'CT',
  '10': 'DE',
  '11': 'DC',
  '12': 'FL',
  '13': 'GA',
  '15': 'HI',
  '16': 'ID',
  '17': 'IL',
  '18': 'IN',
  '19': 'IA',
  '20': 'KS',
  '21': 'KY',
  '22': 'LA',
  '23': 'ME',
  '24': 'MD',
  '25': 'MA',
  '26': 'MI',
  '27': 'MN',
  '28': 'MS',
  '29': 'MO',
  '30': 'MT',
  '31': 'NE',
  '32': 'NV',
  '33': 'NH',
  '34': 'NJ',
  '35': 'NM',
  '36': 'NY',
  '37': 'NC',
  '38': 'ND',
  '39': 'OH',
  '40': 'OK',
  '41': 'OR',
  '42': 'PA',
  '44': 'RI',
  '45': 'SC',
  '46': 'SD',
  '47': 'TN',
  '48': 'TX',
  '49': 'UT',
  '50': 'VT',
  '51': 'VA',
  '53': 'WA',
  '54': 'WV',
  '55': 'WI',
  '56': 'WY',
  '72': 'PR'
};

const KNOWN_ESTIMATED_ROWS: Record<string, string> = {
  propublica_nonprofit: '1293',
  usaspending: '130',
  openalex: '6754',
  ror: 'all ROR rows; filtered to known ROR ids',
  nih_reporter: '2503896',
  college_scorecard: '6322',
  cdc_svi: '3144',
  adi: '524297',
  county_health_rankings: '3143',
  fbi_crime: '1794600',
  census_acs: '35177',
  bls_metro: 'legacy export',
  zillow_zori: 'legacy export'
};

function ensureDirs(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

function payload(row: unknown): JsonObject {
  if (row && typeof row === 'object') {
    const obj = row as JsonObject;
    if (obj.payload && typeof obj.payload === 'object') {
      return obj.payload as JsonObject;
    }
    return obj;
  }
  return {};
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\b(the)\b/g, ' ')
    .replace(/\b(incorporated|inc|llc|l l c|corp|corporation|co|company)\b\.?/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function stateCodeFromNameOrCode(value: unknown): string | null {
  const raw = stringValue(value);
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (STATE_CODE_TO_NAME[upper]) return upper;
  return STATE_NAME_TO_CODE[raw.toLowerCase()] ?? null;
}

function stateCodeFromFips(value: unknown): string | null {
  const raw = String(value ?? '').padStart(2, '0');
  return STATE_FIPS_TO_CODE[raw] ?? null;
}

function nameStateKey(name: string, state?: string | null): string | null {
  const n = normalizeName(name);
  const s = state?.trim().toUpperCase();
  return n && s ? `${n}|${s}` : null;
}

function formatMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2);
}

function moneyBand(value: unknown): string | null {
  const n = numberValue(value);
  if (n == null || n < 0) return null;
  if (n < 1_000_000) return '<$1M';
  if (n < 10_000_000) return '$1M-$10M';
  if (n < 50_000_000) return '$10M-$50M';
  if (n < 250_000_000) return '$50M-$250M';
  if (n < 1_000_000_000) return '$250M-$1B';
  return '$1B+';
}

function nteeDescription(code: string | null): string | null {
  if (!code) return null;
  const first = code.trim().charAt(0).toUpperCase();
  const descriptions: Record<string, string> = {
    A: 'Arts, culture, and humanities',
    B: 'Education',
    E: 'Health care',
    F: 'Mental health and crisis services',
    G: 'Disease and medical research',
    H: 'Medical research',
    J: 'Employment',
    K: 'Food and nutrition',
    O: 'Youth development',
    P: 'Human services',
    T: 'Philanthropy and grantmaking'
  };
  return descriptions[first] ?? null;
}

function addSource(sources: string[], source: string): string[] {
  return sources.includes(source) ? sources : [...sources, source].sort();
}

function sourceIdKey(id: string | null | undefined): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('/');
  return (parts[parts.length - 1] ?? '').trim() || trimmed;
}

function toOpenAlexUrl(id: string | null | undefined): string | null {
  const key = sourceIdKey(id);
  if (!key) return null;
  return key.startsWith('http') ? key : `https://openalex.org/${key}`;
}

function toRorUrl(id: string | null | undefined): string | null {
  const key = sourceIdKey(id);
  if (!key) return null;
  return key.startsWith('http') ? key : `https://ror.org/${key}`;
}

async function readJsonl(
  filePath: string,
  onRow: (row: unknown, rowNumber: number) => void | Promise<void>
): Promise<number> {
  if (!fs.existsSync(filePath)) return 0;
  const input = filePath.endsWith('.gz')
    ? fs.createReadStream(filePath).pipe(createGunzip())
    : fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  let rowNumber = 0;
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    rowNumber += 1;
    try {
      await onRow(JSON.parse(trimmed), rowNumber);
    } catch (err) {
      throw new Error(`${filePath} line ${rowNumber}: ${String(err)}`);
    }
  }
  return rowNumber;
}

function readEnvelopeRecords<T>(filename: string): T[] {
  const raw = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, filename), 'utf8')
  ) as { records?: T[] };
  return Array.isArray(raw.records) ? raw.records : [];
}

function writeEnvelope<T>(filename: string, records: T[]): void {
  const envelope: Envelope<T> = {
    meta: {
      generated_at: new Date().toISOString(),
      generated_by: 'scripts/data/build-static-enrichment-v2.ts',
      permission_status: PERMISSION_STATUS,
      output_policy:
        'Small aggregate/static output only; no raw customer package files, filings, abstracts, or grant text.'
    },
    records
  };
  fs.writeFileSync(
    path.join(DATA_DIR, filename),
    `${JSON.stringify(envelope, null, 2)}\n`,
    'utf8'
  );
}

function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(filePath: string, rows: InputFileReportRow[]): void {
  const headers = [
    'source_name',
    'input_path',
    'exists',
    'format',
    'size_mb',
    'estimated_rows',
    'read_method',
    'will_use_now',
    'reason'
  ] as const;
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','))
  ];
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function resolvedInputRows(): InputFileReportRow[] {
  const useNow: Record<string, { use: boolean; method: string; reason: string }> = {
    propublica_nonprofit: {
      use: true,
      method: 'stream JSONL; select organization identity and aggregate bands',
      reason: 'Build provider nonprofit context with strict name+state/EIN matching.'
    },
    usaspending: {
      use: true,
      method: 'stream JSONL; aggregate recipient award counts and totals',
      reason: 'Optional scoped public funding context when exact recipient/EIN joins exist.'
    },
    openalex: {
      use: true,
      method: 'stream JSONL; join by OpenAlex/ROR id or exact name+state',
      reason: 'Build institution research indicators.'
    },
    ror: {
      use: true,
      method: 'stream gz JSONL; filter to known ROR ids',
      reason: 'Institution identity and homepage/type enrichment.'
    },
    nih_reporter: {
      use: true,
      method: 'stream JSONL; aggregate by exact organization name+state',
      reason: 'NIH aggregate-only project counts, latest year, and funding bands.'
    },
    college_scorecard: {
      use: true,
      method: 'reuse existing school_enrichment identity; source path recorded',
      reason: 'Strict school identity join foundation for research output.'
    },
    cdc_svi: {
      use: true,
      method: 'stream gz JSONL; aggregate county counts and state bands',
      reason: 'Neutral state social context.'
    },
    adi: {
      use: true,
      method: 'stream JSONL; aggregate latest block-group data to state level',
      reason: 'Neutral state-level ADI bands only.'
    },
    county_health_rankings: {
      use: true,
      method: 'stream gz JSONL; count state coverage only',
      reason: 'Neutral county health data availability context.'
    },
    fbi_crime: {
      use: false,
      method: 'not re-read; existing state_affordability aggregate already live',
      reason: 'Avoid reprocessing large raw public safety rows in D8.'
    },
    census_acs: {
      use: false,
      method: 'not re-read; existing state_affordability aggregate already live',
      reason: 'State affordability already carries Census state context.'
    },
    bls_metro: {
      use: false,
      method: 'resolved only',
      reason: 'Optional city/rent follow-up, not needed for the three D8 outputs.'
    },
    zillow_zori: {
      use: false,
      method: 'resolved only',
      reason: 'Optional city/rent follow-up, not needed for the three D8 outputs.'
    }
  };

  return Object.entries(PATHS).map(([sourceName, inputPath]) => {
    const stat = fs.existsSync(inputPath) ? fs.statSync(inputPath) : null;
    const policy = useNow[sourceName] ?? {
      use: false,
      method: 'missing',
      reason: 'Not part of D8.'
    };
    return {
      source_name: sourceName,
      input_path: inputPath,
      exists: Boolean(stat),
      format:
        inputPath.endsWith('.jsonl.gz') ? 'jsonl.gz'
        : inputPath.endsWith('.jsonl') ? 'jsonl'
        : path.extname(inputPath).replace(/^\./, '') || 'unknown',
      size_mb: stat ? formatMb(stat.size) : '',
      estimated_rows: KNOWN_ESTIMATED_ROWS[sourceName] ?? '',
      read_method: policy.method,
      will_use_now: policy.use ? 'yes' : 'no',
      reason: policy.reason
    };
  });
}

async function buildProviderNonprofit(): Promise<ProviderNonprofitRecord[]> {
  const usaspendingByName = new Map<
    string,
    { awardCount: number; totalObligated: number; fiscalYear: number | null }
  >();
  const usaspendingByEin = new Map<
    string,
    { awardCount: number; totalObligated: number; fiscalYear: number | null }
  >();

  await readJsonl(PATHS.usaspending, (row) => {
    const p = payload(row);
    const name = stringValue(p.name);
    const amount = numberValue(p.amount) ?? 0;
    const fiscalYear = numberValue(p.fiscal_year);
    const key = name ? normalizeName(name) : null;
    if (key) {
      const existing = usaspendingByName.get(key) ?? {
        awardCount: 0,
        totalObligated: 0,
        fiscalYear: null
      };
      existing.awardCount += 1;
      existing.totalObligated += amount;
      existing.fiscalYear = Math.max(existing.fiscalYear ?? 0, fiscalYear ?? 0) || null;
      usaspendingByName.set(key, existing);
    }

    const code = stringValue(p.code)?.replace(/\D/g, '');
    if (code) {
      const existing = usaspendingByEin.get(code) ?? {
        awardCount: 0,
        totalObligated: 0,
        fiscalYear: null
      };
      existing.awardCount += 1;
      existing.totalObligated += amount;
      existing.fiscalYear = Math.max(existing.fiscalYear ?? 0, fiscalYear ?? 0) || null;
      usaspendingByEin.set(code, existing);
    }
  });

  const records: ProviderNonprofitRecord[] = [];

  await readJsonl(PATHS.propublica_nonprofit, (row) => {
    const p = payload(row);
    const name =
      stringValue(p.organization_name) ??
      stringValue(p.target_institution_name) ??
      null;
    const state = stateCodeFromNameOrCode(p.state);
    const normalizedName = name ? normalizeName(name) : '';
    if (!name || !state || !normalizedName) return;

    const ein = stringValue(p.ein)?.replace(/\D/g, '') ?? null;
    const einKey = ein?.replace(/^0+/, '') ?? null;
    const usa =
      (einKey ? usaspendingByEin.get(einKey) : undefined) ??
      usaspendingByName.get(normalizedName) ??
      null;

    const sources = usa ? ['propublica_nonprofit', 'usaspending'] : ['propublica_nonprofit'];
    const sourceYears: Record<string, string | number> = {};
    const rulingYear = numberValue(p.ruling_year);
    if (rulingYear != null) sourceYears.propublica_ruling_year = rulingYear;
    if (usa?.fiscalYear) sourceYears.usaspending_fiscal_year = usa.fiscalYear;

    records.push({
      provider_key: `${normalizedName}|${state}|${ein ?? 'no-ein'}`,
      name,
      normalized_name: normalizedName,
      ein,
      city: stringValue(p.city),
      state,
      ntee_code: stringValue(p.ntee_code),
      ntee_description: nteeDescription(stringValue(p.ntee_code)),
      organization_type:
        numberValue(p.subsection_code) != null
          ? `501(c)(${numberValue(p.subsection_code)})`
          : null,
      ruling_year: rulingYear,
      revenue_band: moneyBand(p.revenue_amount),
      assets_band: moneyBand(p.asset_amount),
      has_recent_filing:
        Boolean(p.have_filings) || (numberValue(p.filings_with_data_count) ?? 0) > 0,
      propublica_url: ein
        ? `https://projects.propublica.org/nonprofits/organizations/${ein}`
        : null,
      usaspending_award_count: usa?.awardCount ?? null,
      usaspending_total_obligated:
        usa && Number.isFinite(usa.totalObligated)
          ? Math.round(usa.totalObligated)
          : null,
      source_years: Object.keys(sourceYears).length ? sourceYears : undefined,
      sources
    });
  });

  return records.sort((a, b) => a.name.localeCompare(b.name) || (a.state ?? '').localeCompare(b.state ?? ''));
}

function researchSignalCounts(value: unknown): {
  works_count: number | null;
  cited_by_count: number | null;
} {
  if (!value || typeof value !== 'object') {
    return { works_count: null, cited_by_count: null };
  }
  const obj = value as JsonObject;
  return {
    works_count: numberValue(obj.works_count),
    cited_by_count: numberValue(obj.cited_by_count)
  };
}

function researchSummary(row: InstitutionResearchRecord): string | null {
  if (row.works_count != null && row.nih_project_count != null) {
    return 'Public research indicators are available from OpenAlex and NIH RePORTER aggregates.';
  }
  if (row.works_count != null) {
    return 'Public research indicators are available from OpenAlex.';
  }
  if (row.nih_project_count != null) {
    return 'Public research funding context is available from NIH RePORTER aggregates.';
  }
  if (row.ror_id) {
    return 'Public institution identity is available from ROR.';
  }
  return null;
}

async function buildInstitutionResearch(): Promise<InstitutionResearchRecord[]> {
  const schools = readEnvelopeRecords<JsonObject>('school_enrichment.json');
  const records: InstitutionResearchRecord[] = [];
  const byUnit = new Map<string, InstitutionResearchRecord>();
  const byOpenAlex = new Map<string, InstitutionResearchRecord>();
  const byRor = new Map<string, InstitutionResearchRecord>();
  const nameStateCounts = new Map<string, number>();
  const byNameState = new Map<string, InstitutionResearchRecord>();

  for (const row of schools) {
    const name = stringValue(row.school_name);
    const state = stateCodeFromNameOrCode(row.state);
    if (!name || !state) continue;

    const key = nameStateKey(name, state);
    if (key) nameStateCounts.set(key, (nameStateCounts.get(key) ?? 0) + 1);
  }

  for (const row of schools) {
    const name = stringValue(row.school_name);
    const state = stateCodeFromNameOrCode(row.state);
    if (!name || !state) continue;

    const { works_count, cited_by_count } = researchSignalCounts(row.research_signal);
    const unitId = stringValue(row.unit_id);
    const rorKey = sourceIdKey(stringValue(row.ror_id));
    const openAlexKey = sourceIdKey(stringValue(row.openalex_id));

    const out: InstitutionResearchRecord = {
      institution_key: unitId
        ? `unit:${unitId}`
        : `${normalizeName(name)}|${state}`,
      name,
      normalized_name: normalizeName(name),
      state,
      unit_id: unitId,
      opeid: stringValue(row.opeid),
      ror_id: toRorUrl(rorKey),
      openalex_id: toOpenAlexUrl(openAlexKey),
      homepage: stringValue(row.website),
      institution_type: null,
      country: 'US',
      works_count,
      cited_by_count,
      nih_project_count: null,
      nih_total_funding_band: null,
      nih_latest_year: null,
      research_summary: null,
      sources: ['college_scorecard']
    };

    if (out.openalex_id || out.works_count != null) out.sources = addSource(out.sources, 'openalex');
    if (out.ror_id) out.sources = addSource(out.sources, 'ror');

    records.push(out);
    if (unitId) byUnit.set(unitId, out);
    if (openAlexKey) byOpenAlex.set(openAlexKey, out);
    if (rorKey) byRor.set(rorKey, out);

    const key = nameStateKey(name, state);
    if (key && nameStateCounts.get(key) === 1) byNameState.set(key, out);
  }

  await readJsonl(PATHS.openalex, (row) => {
    const p = payload(row);
    const openAlexKey = sourceIdKey(stringValue(p.openalex_key) ?? stringValue(p.openalex_id));
    const rorKey = sourceIdKey(stringValue(p.ror_key) ?? stringValue(p.ror_id));
    const state = stateCodeFromNameOrCode(p.state);
    const name = stringValue(p.display_name) ?? stringValue(p.ror_display_name);
    const byExactName = name && state ? byNameState.get(`${normalizeName(name)}|${state}`) : null;
    const out =
      (openAlexKey ? byOpenAlex.get(openAlexKey) : undefined) ??
      (rorKey ? byRor.get(rorKey) : undefined) ??
      byExactName ??
      null;
    if (!out) return;

    out.openalex_id = toOpenAlexUrl(openAlexKey) ?? out.openalex_id ?? null;
    out.ror_id = toRorUrl(rorKey) ?? out.ror_id ?? null;
    out.homepage = stringValue(p.homepage_url) ?? out.homepage ?? null;
    out.institution_type = stringValue(p.type) ?? out.institution_type ?? null;
    out.country = stringValue(p.country) ?? out.country ?? null;
    out.works_count = numberValue(p.works_count) ?? out.works_count ?? null;
    out.cited_by_count = numberValue(p.cited_by_count) ?? out.cited_by_count ?? null;
    out.sources = addSource(addSource(out.sources, 'openalex'), 'ror');
  });

  const neededRorKeys = new Set(
    records.map((row) => sourceIdKey(row.ror_id ?? undefined)).filter((v): v is string => Boolean(v))
  );
  await readJsonl(PATHS.ror, (row) => {
    const p = payload(row);
    const rorKey = sourceIdKey(stringValue(p.ror_key) ?? stringValue(p.ror_id));
    if (!rorKey || !neededRorKeys.has(rorKey)) return;
    const out = byRor.get(rorKey);
    if (!out) return;

    const links = Array.isArray(p.links) ? p.links : [];
    const homepage =
      links
        .map((link) => (link && typeof link === 'object' ? stringValue((link as JsonObject).value) : null))
        .find((value) => value && /^https?:\/\//i.test(value)) ?? null;
    const types = Array.isArray(p.types)
      ? p.types.filter((value): value is string => typeof value === 'string')
      : [];
    out.homepage = out.homepage ?? homepage;
    out.institution_type = out.institution_type ?? types[0] ?? null;
    out.country = out.country ?? stringValue(p.country_code) ?? stringValue(p.country) ?? null;
    out.sources = addSource(out.sources, 'ror');
  });

  const nihAgg = new Map<
    string,
    { projectCount: number; totalFunding: number; latestYear: number | null }
  >();
  await readJsonl(PATHS.nih_reporter, (row, rowNumber) => {
    if (rowNumber % 250000 === 0) {
      console.log(`NIH aggregate progress: ${rowNumber.toLocaleString()} rows`);
    }
    const p = payload(row);
    const country = stringValue(p.org_country);
    if (country && country.toUpperCase() !== 'UNITED STATES') return;
    const orgName = stringValue(p.organization_name);
    const state = stateCodeFromNameOrCode(p.org_state);
    if (!orgName || !state) return;
    const key = nameStateKey(orgName, state);
    if (!key || !byNameState.has(key)) return;
    const existing = nihAgg.get(key) ?? {
      projectCount: 0,
      totalFunding: 0,
      latestYear: null
    };
    existing.projectCount += 1;
    existing.totalFunding += numberValue(p.award_amount) ?? 0;
    const fy = numberValue(p.fiscal_year);
    if (fy != null) existing.latestYear = Math.max(existing.latestYear ?? 0, fy);
    nihAgg.set(key, existing);
  });

  for (const [key, agg] of nihAgg) {
    const out = byNameState.get(key);
    if (!out) continue;
    out.nih_project_count = agg.projectCount;
    out.nih_total_funding_band = moneyBand(agg.totalFunding);
    out.nih_latest_year = agg.latestYear;
    out.sources = addSource(out.sources, 'nih_reporter');
  }

  for (const row of records) {
    row.research_summary = researchSummary(row);
  }

  return records
    .filter(
      (row) =>
        row.works_count != null ||
        row.cited_by_count != null ||
        row.nih_project_count != null ||
        Boolean(row.ror_id)
    )
    .sort((a, b) => a.name.localeCompare(b.name) || (a.state ?? '').localeCompare(b.state ?? ''));
}

function indicatorBand(value: number | null, scaleMax: number): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const ratio = value / scaleMax;
  if (ratio < 0.33) return 'lower indicator band';
  if (ratio < 0.66) return 'middle indicator band';
  return 'higher indicator band';
}

async function buildStateSocialContext(): Promise<StateSocialContextRecord[]> {
  const stateRows = readEnvelopeRecords<JsonObject>('state_affordability.json');
  const contexts = new Map<string, StateSocialContextRecord>();

  for (const row of stateRows) {
    const code = stateCodeFromNameOrCode(row.state_code);
    if (!code) continue;
    contexts.set(code, {
      state_code: code,
      state_name: stringValue(row.state) ?? STATE_CODE_TO_NAME[code] ?? code,
      svi_context: null,
      svi_percentile_band: null,
      adi_context: null,
      adi_percentile_band: null,
      county_health_context: null,
      counties_with_svi_data: null,
      counties_with_adi_data: null,
      counties_with_health_data: null,
      source_years: {},
      display_policy: {
        neutral_context_only: true,
        no_rankings: true,
        no_eligibility_claims: true
      },
      sources: []
    });
  }

  const svi = new Map<string, { count: number; sum: number; year: number | null }>();
  await readJsonl(PATHS.cdc_svi, (row) => {
    const p = payload(row);
    const raw = p.raw && typeof p.raw === 'object' ? (p.raw as JsonObject) : {};
    const code =
      stateCodeFromNameOrCode(raw.ST_ABBR) ??
      stateCodeFromFips(p.state_abbr) ??
      stateCodeFromNameOrCode(p.state);
    if (!code || !contexts.has(code)) return;
    const percentile = numberValue(p.overall_svi_percentile);
    if (percentile == null) return;
    const existing = svi.get(code) ?? { count: 0, sum: 0, year: null };
    existing.count += 1;
    existing.sum += percentile;
    const year = numberValue(p.year);
    if (year != null) existing.year = Math.max(existing.year ?? 0, year);
    svi.set(code, existing);
  });

  const adi = new Map<
    string,
    { count: number; sum: number; year: number | null; counties: Set<string> }
  >();
  await readJsonl(PATHS.adi, (row, rowNumber) => {
    if (rowNumber % 200000 === 0) {
      console.log(`ADI aggregate progress: ${rowNumber.toLocaleString()} rows`);
    }
    const p = payload(row);
    const year = numberValue(p.data_year);
    if (year !== 2023) return;
    const code = stateCodeFromFips(p.state_fips);
    if (!code || !contexts.has(code)) return;
    const rank = numberValue(p.adi_national_rank);
    if (rank == null) return;
    const existing = adi.get(code) ?? {
      count: 0,
      sum: 0,
      year,
      counties: new Set<string>()
    };
    existing.count += 1;
    existing.sum += rank;
    existing.year = Math.max(existing.year ?? 0, year);
    const county = stringValue(p.county_fips);
    if (county) existing.counties.add(county);
    adi.set(code, existing);
  });

  const health = new Map<string, { counties: Set<string>; year: number | null }>();
  await readJsonl(PATHS.county_health_rankings, (row) => {
    const p = payload(row);
    const raw = p.raw && typeof p.raw === 'object' ? (p.raw as JsonObject) : {};
    const code = stateCodeFromNameOrCode(raw.state) ?? stateCodeFromNameOrCode(p.state);
    if (!code || !contexts.has(code)) return;
    const county =
      stringValue(raw.fipscode) ??
      stringValue(raw.countycode) ??
      stringValue(p.source_key);
    const existing = health.get(code) ?? { counties: new Set<string>(), year: null };
    if (county) existing.counties.add(county);
    const year = numberValue(raw.year) ?? numberValue(p.year);
    if (year != null) existing.year = Math.max(existing.year ?? 0, year);
    health.set(code, existing);
  });

  for (const [code, row] of contexts) {
    const sviAgg = svi.get(code);
    if (sviAgg?.count) {
      const avg = sviAgg.sum / sviAgg.count;
      row.counties_with_svi_data = sviAgg.count;
      row.svi_percentile_band = indicatorBand(avg, 1);
      row.svi_context = `CDC SVI county data is available for ${sviAgg.count.toLocaleString('en-US')} counties; county indicators vary and are best used as public planning context.`;
      if (sviAgg.year) row.source_years!.cdc_svi = sviAgg.year;
      row.sources = addSource(row.sources, 'cdc_svi');
    }

    const adiAgg = adi.get(code);
    if (adiAgg?.count) {
      const avg = adiAgg.sum / adiAgg.count;
      const counties = adiAgg.counties.size;
      row.counties_with_adi_data = counties || null;
      row.adi_percentile_band = indicatorBand(avg, 100);
      row.adi_context = `ADI block-group data is available across ${counties.toLocaleString('en-US')} counties; local conditions can vary within the same state.`;
      if (adiAgg.year) row.source_years!.adi = adiAgg.year;
      row.sources = addSource(row.sources, 'adi');
    }

    const healthAgg = health.get(code);
    if (healthAgg?.counties.size) {
      const count = healthAgg.counties.size;
      row.counties_with_health_data = count;
      row.county_health_context = `County health public data is available for ${count.toLocaleString('en-US')} counties; use it alongside cost, school, and scholarship details.`;
      if (healthAgg.year) row.source_years!.county_health_rankings = healthAgg.year;
      row.sources = addSource(row.sources, 'county_health_rankings');
    }

    if (!Object.keys(row.source_years ?? {}).length) {
      row.source_years = undefined;
    }
  }

  return [...contexts.values()].sort((a, b) => a.state_name.localeCompare(b.state_name));
}

function writeOutputBuildReport(rows: Array<{ name: string; records: number; bytes: number }>): void {
  const totalBytes = rows.reduce((sum, row) => sum + row.bytes, 0);
  const lines = [
    '# D8 Output Build Report',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    '## Outputs',
    '',
    '| File | Rows | Size MB | Policy |',
    '|---|---:|---:|---|',
    ...rows.map(
      (row) =>
        `| \`${row.name}\` | ${row.records.toLocaleString('en-US')} | ${formatMb(row.bytes)} | aggregate/static only |`
    ),
    '',
    `Total new output size: ${formatMb(totalBytes)} MB.`,
    '',
    '## Matching And Aggregation',
    '',
    '- Provider nonprofit: exact normalized organization name + state and EIN where available; ambiguous names are hidden by the loader.',
    '- Institution research: Scorecard identity joined to OpenAlex/ROR ids, with NIH RePORTER aggregated by exact organization name + state.',
    '- State social context: CDC SVI, ADI, and County Health data aggregated to state-level counts and neutral bands.',
    '- No raw filings, NIH abstracts, project text, block-group rows, or source package files are shipped.'
  ];
  fs.writeFileSync(
    path.join(REPORT_DIR, 'd8-output-build-report.md'),
    `${lines.join('\n')}\n`,
    'utf8'
  );
}

async function main(): Promise<void> {
  ensureDirs();

  const resolvedRows = resolvedInputRows();
  writeCsv(path.join(REPORT_DIR, 'd8-resolved-input-files.csv'), resolvedRows);

  console.log('Building provider nonprofit enrichment...');
  const providerRows = await buildProviderNonprofit();
  writeEnvelope('provider_nonprofit_enrichment.json', providerRows);

  console.log('Building institution research enrichment...');
  const researchRows = await buildInstitutionResearch();
  writeEnvelope('institution_research_enrichment.json', researchRows);

  console.log('Building state social context...');
  const socialRows = await buildStateSocialContext();
  writeEnvelope('state_social_context.json', socialRows);

  const outputRows = [
    'provider_nonprofit_enrichment.json',
    'institution_research_enrichment.json',
    'state_social_context.json'
  ].map((name) => {
    const filePath = path.join(DATA_DIR, name);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
      records?: unknown[];
    };
    return {
      name,
      records: Array.isArray(parsed.records) ? parsed.records.length : 0,
      bytes: fs.statSync(filePath).size
    };
  });
  writeOutputBuildReport(outputRows);

  for (const row of outputRows) {
    console.log(
      `${row.name}: ${row.records.toLocaleString('en-US')} rows, ${formatMb(row.bytes)} MB`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
