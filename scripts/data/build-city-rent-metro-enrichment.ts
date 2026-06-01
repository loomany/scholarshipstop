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

type CityAffordabilityRow = {
  city: string;
  state: string;
  city_ascii?: string;
  county?: string | null;
  county_fips?: number | string | null;
  lat?: number | null;
  lng?: number | null;
  population?: number | null;
  hud_fmr_1br?: number | null;
  hud_fmr_2br?: number | null;
  sources?: string[];
};

type LocationCrosswalkRow = {
  location_key: string;
  city: string;
  state: string;
  state_code?: string;
  county?: string | null;
  county_fips?: number | string | null;
  lat?: number | null;
  lng?: number | null;
  population?: number | null;
  sources?: string[];
};

type MetroWage = {
  metro_name: string;
  metro_code: string;
  states: string[];
  city_tokens: string[];
  bls_median_wage: number | null;
  bls_mean_wage: number | null;
  bls_employment: number | null;
  bls_year: number | null;
};

type MetroRent = {
  metro_name: string;
  metro_code: string | null;
  states: string[];
  city_tokens: string[];
  zillow_latest_rent: number | null;
  zillow_rent_12mo_change_pct: number | null;
  zillow_latest_month: string | null;
};

type CityRentMetroRecord = {
  city_key: string;
  city: string;
  state: string;
  state_code: string;
  county?: string | null;
  county_fips?: string | null;
  metro_name?: string | null;
  metro_code?: string | null;
  lat?: number | null;
  lng?: number | null;
  population?: number | null;
  hud_fmr_1br?: number | null;
  hud_fmr_2br?: number | null;
  zillow_latest_rent?: number | null;
  zillow_rent_12mo_change_pct?: number | null;
  zillow_latest_month?: string | null;
  bls_median_wage?: number | null;
  bls_mean_wage?: number | null;
  bls_employment?: number | null;
  bls_year?: number | null;
  rent_context?: string | null;
  wage_context?: string | null;
  source_years?: Record<string, string | number>;
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
const OUTPUT_FILE = 'city_rent_metro_enrichment.json';
const PERMISSION_STATUS = 'permission_received_per_user_statement';

const PATHS = {
  bls_metro: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/01_legacy_supabase_exports/bls_metro/bls_metro.jsonl.gz'
  ),
  zillow_zori: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/01_legacy_supabase_exports/zillow_zori/zillow_zori.jsonl.gz'
  ),
  hud_fmr: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/02_local_normalized_sources/hud_fmr/normalized/hud_fmr.jsonl'
  ),
  uscities: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/01_legacy_supabase_exports/uscities/uscities.jsonl.gz'
  ),
  geonames: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/02_local_normalized_sources/geonames/normalized/geonames.jsonl'
  ),
  city_affordability: path.join(DATA_DIR, 'city_affordability.json'),
  location_crosswalk: path.join(DATA_DIR, 'location_crosswalk.json')
} as const;

const ESTIMATED_ROWS: Record<string, string> = {
  bls_metro: '150176',
  zillow_zori: '4432',
  hud_fmr: '2660',
  uscities: 'legacy export',
  geonames: 'local normalized source',
  city_affordability: '2759',
  location_crosswalk: '2704'
};

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

function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bst[.]\b/gi, 'saint')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function cityStateKey(city: string, stateCode: string): string {
  return `${normalizeText(city)}|${stateCode.trim().toUpperCase()}`;
}

function stateCode(value: unknown): string | null {
  const raw = stringValue(value);
  if (!raw) return null;
  const upper = raw.toUpperCase();
  return STATE_CODE_TO_NAME[upper] ? upper : null;
}

function formatMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2);
}

function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function addSource(sources: string[], source: string): string[] {
  return sources.includes(source) ? sources : [...sources, source].sort();
}

function readEnvelopeRecords<T>(filename: string): T[] {
  const raw = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, filename), 'utf8')
  ) as { records?: T[] };
  return Array.isArray(raw.records) ? raw.records : [];
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

function writeEnvelope<T>(filename: string, records: T[]): void {
  const envelope: Envelope<T> = {
    meta: {
      generated_at: new Date().toISOString(),
      generated_by: 'scripts/data/build-city-rent-metro-enrichment.ts',
      permission_status: PERMISSION_STATUS,
      output_policy:
        'Small aggregate/static output only; no raw monthly Zillow series, BLS occupation tables, or customer package files.'
    },
    records
  };
  fs.writeFileSync(
    path.join(DATA_DIR, filename),
    `${JSON.stringify(envelope, null, 2)}\n`,
    'utf8'
  );
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
  const policies: Record<string, { method: string; use: boolean; reason: string }> = {
    bls_metro: {
      method: 'stream gz JSONL; keep only all-occupations metro wage rows',
      use: true,
      reason: 'Adds compact metro wage context when city token + state match is exact.'
    },
    zillow_zori: {
      method: 'stream gz JSONL; reduce wide monthly series to latest rent and 12-month change',
      use: true,
      reason: 'Adds compact metro rent trend context without shipping monthly series.'
    },
    hud_fmr: {
      method: 'not reread for output; resolved as fallback source',
      use: false,
      reason: 'Existing city_affordability.json already carries compact HUD FMR fields.'
    },
    uscities: {
      method: 'not reread for output; resolved as fallback source',
      use: false,
      reason: 'Existing location_crosswalk.json already carries compact city identity fields.'
    },
    geonames: {
      method: 'not reread for output; resolved as fallback source',
      use: false,
      reason: 'Existing location_crosswalk.json already carries compact city identity fields.'
    },
    city_affordability: {
      method: 'read local small JSON envelope',
      use: true,
      reason: 'Provides existing compact HUD FMR fields for exact city/state keys.'
    },
    location_crosswalk: {
      method: 'read local small JSON envelope',
      use: true,
      reason: 'Provides one-row-per-location city/state base and strict lookup keys.'
    }
  };

  return Object.entries(PATHS).map(([sourceName, inputPath]) => {
    const stat = fs.existsSync(inputPath) ? fs.statSync(inputPath) : null;
    const policy = policies[sourceName];
    return {
      source_name: sourceName,
      input_path: inputPath,
      exists: Boolean(stat),
      format:
        inputPath.endsWith('.jsonl.gz') ? 'jsonl.gz'
        : inputPath.endsWith('.jsonl') ? 'jsonl'
        : inputPath.endsWith('.json') ? 'json'
        : path.extname(inputPath).replace(/^\./, '') || 'unknown',
      size_mb: stat ? formatMb(stat.size) : '',
      estimated_rows: ESTIMATED_ROWS[sourceName] ?? '',
      read_method: policy.method,
      will_use_now: policy.use ? 'yes' : 'no',
      reason: policy.reason
    };
  });
}

function parseMetroParts(metroName: string): { cityTokens: string[]; states: string[] } {
  const [cityPartRaw, statePartRaw] = metroName.split(',').map((p) => p.trim());
  if (!cityPartRaw || !statePartRaw) return { cityTokens: [], states: [] };
  if (/nonmetropolitan/i.test(cityPartRaw)) return { cityTokens: [], states: [] };

  const cityTokens = cityPartRaw
    .replace(/\b(MSA|NECTA|HMFA|MD)\b/gi, '')
    .split('-')
    .map((token) => normalizeText(token))
    .filter(Boolean);
  const states = statePartRaw
    .replace(/\b(MSA|NECTA|HMFA|MD)\b/gi, '')
    .split('-')
    .map((token) => token.trim().toUpperCase())
    .filter((token) => Boolean(STATE_CODE_TO_NAME[token]));

  return {
    cityTokens: [...new Set(cityTokens)],
    states: [...new Set(states)]
  };
}

function addMetroCandidate<T>(
  index: Map<string, T[]>,
  metro: T & { states: string[]; city_tokens: string[] }
): void {
  for (const state of metro.states) {
    for (const cityToken of metro.city_tokens) {
      const key = `${cityToken}|${state}`;
      const rows = index.get(key) ?? [];
      rows.push(metro);
      index.set(key, rows);
    }
  }
}

async function buildBlsMetroIndex(): Promise<{
  index: Map<string, MetroWage[]>;
  rowsRead: number;
  allOccupationRows: number;
}> {
  const index = new Map<string, MetroWage[]>();
  let allOccupationRows = 0;

  const rowsRead = await readJsonl(PATHS.bls_metro, (row) => {
    const p = payload(row);
    const occupationCode = stringValue(p.occupation_code);
    if (occupationCode !== '00-0000') return;
    const metroName = stringValue(p.area_name);
    const metroCode = stringValue(p.area_code);
    if (!metroName || !metroCode) return;

    const { cityTokens, states } = parseMetroParts(metroName);
    if (!cityTokens.length || !states.length) return;

    allOccupationRows += 1;
    addMetroCandidate(index, {
      metro_name: metroName,
      metro_code: metroCode,
      states,
      city_tokens: cityTokens,
      bls_median_wage: numberValue(p.annual_median),
      bls_mean_wage: numberValue(p.annual_mean_wage),
      bls_employment: numberValue(p.total_employment),
      bls_year: numberValue(p.year)
    });
  });

  return { index, rowsRead, allOccupationRows };
}

function monthLabel(dateKey: string): string {
  return dateKey.slice(0, 7);
}

function latestZillowValues(p: JsonObject): {
  latestRent: number | null;
  latestMonth: string | null;
  changePct: number | null;
} {
  const values = Object.keys(p)
    .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))
    .sort()
    .map((key) => ({ key, value: numberValue(p[key]) }))
    .filter((item): item is { key: string; value: number } => item.value != null);

  const latest = values[values.length - 1];
  if (!latest) {
    return { latestRent: null, latestMonth: null, changePct: null };
  }

  const prior = values.length > 12 ? values[values.length - 13] : null;
  const changePct =
    prior && prior.value > 0
      ? Math.round(((latest.value - prior.value) / prior.value) * 1000) / 10
      : null;

  return {
    latestRent: Math.round(latest.value),
    latestMonth: monthLabel(latest.key),
    changePct
  };
}

async function buildZillowMetroIndex(): Promise<{
  index: Map<string, MetroRent[]>;
  rowsRead: number;
  usableRows: number;
}> {
  const index = new Map<string, MetroRent[]>();
  let usableRows = 0;

  const rowsRead = await readJsonl(PATHS.zillow_zori, (row) => {
    const p = payload(row);
    const metroName = stringValue(p.Metro);
    const regionName = stringValue(p.RegionName);
    const regionType = stringValue(p.RegionType)?.toLowerCase();
    const state = stateCode(p.StateName) ?? stateCode(p.State);
    if (!metroName || !regionName || !state || regionType !== 'city') return;

    const cityTokens = [normalizeText(regionName)].filter(Boolean);
    if (!cityTokens.length) return;

    const latest = latestZillowValues(p);
    if (latest.latestRent == null) return;

    usableRows += 1;
    addMetroCandidate(index, {
      metro_name: metroName,
      metro_code: null,
      states: [state],
      city_tokens: cityTokens,
      zillow_latest_rent: latest.latestRent,
      zillow_rent_12mo_change_pct: latest.changePct,
      zillow_latest_month: latest.latestMonth
    });
  });

  return { index, rowsRead, usableRows };
}

function uniqueCandidate<T extends { metro_name: string; metro_code: string | null }>(
  rows: T[] | undefined
): T | null {
  if (!rows?.length) return null;
  const unique = new Map<string, T>();
  for (const row of rows) {
    unique.set(`${normalizeText(row.metro_name)}|${row.metro_code}`, row);
  }
  return unique.size === 1 ? [...unique.values()][0] ?? null : null;
}

function locationCompletenessScore(row: LocationCrosswalkRow): number {
  return [
    row.county ? 3 : 0,
    row.county_fips != null ? 3 : 0,
    row.lat != null ? 2 : 0,
    row.lng != null ? 2 : 0,
    row.population != null ? 1 : 0,
    row.sources?.includes('uscities') ? 1 : 0,
    row.sources?.includes('geonames') ? 1 : 0
  ].reduce((sum, value) => sum + value, 0);
}

function dedupeLocations(rows: LocationCrosswalkRow[]): {
  records: LocationCrosswalkRow[];
  duplicateCityKeys: number;
} {
  const byKey = new Map<string, LocationCrosswalkRow>();
  const duplicateKeys = new Set<string>();

  for (const row of rows) {
    const state = stateCode(row.state_code) ?? stateCode(row.state);
    if (!row.city || !state) continue;
    const key = cityStateKey(row.city, state);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }

    duplicateKeys.add(key);
    if (locationCompletenessScore(row) > locationCompletenessScore(existing)) {
      byKey.set(key, row);
    }
  }

  return {
    records: [...byKey.values()],
    duplicateCityKeys: duplicateKeys.size
  };
}

function sourceYears(
  affordability: CityAffordabilityRow | null,
  bls: MetroWage | null,
  zillow: MetroRent | null
): Record<string, string | number> | undefined {
  const years: Record<string, string | number> = {};
  if (affordability?.hud_fmr_1br != null || affordability?.hud_fmr_2br != null) {
    years.hud_fmr = 2026;
  }
  if (bls?.bls_year) years.bls_metro = bls.bls_year;
  if (zillow?.zillow_latest_month) years.zillow_zori = zillow.zillow_latest_month;
  return Object.keys(years).length ? years : undefined;
}

function rentContext(row: {
  zillow_latest_rent?: number | null;
  hud_fmr_1br?: number | null;
  hud_fmr_2br?: number | null;
  metro_name?: string | null;
}): string | null {
  if (row.zillow_latest_rent != null && row.metro_name) {
    return 'Public metro rent estimates are available for relocation and cost-of-attendance planning; local lease costs can vary within the metro area.';
  }
  if (row.hud_fmr_1br != null || row.hud_fmr_2br != null) {
    return 'HUD fair-market rent estimates are available as planning context; use them alongside school cost and scholarship amount.';
  }
  return null;
}

function wageContext(row: { bls_median_wage?: number | null; metro_name?: string | null }): string | null {
  if (row.bls_median_wage != null && row.metro_name) {
    return 'BLS metro wage estimates provide public labor-market context for relocation planning; they do not imply scholarship eligibility.';
  }
  return null;
}

function buildCityAffordabilityIndex(): {
  byKey: Map<string, CityAffordabilityRow>;
  ambiguousKeys: Set<string>;
} {
  const rows = readEnvelopeRecords<CityAffordabilityRow>('city_affordability.json');
  const counts = new Map<string, number>();
  const byKey = new Map<string, CityAffordabilityRow>();

  for (const row of rows) {
    const state = stateCode(row.state);
    if (!row.city || !state) continue;
    const keys = [cityStateKey(row.city, state)];
    if (row.city_ascii) keys.push(cityStateKey(row.city_ascii, state));
    for (const key of new Set(keys)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!byKey.has(key)) byKey.set(key, row);
    }
  }

  const ambiguousKeys = new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key)
  );
  for (const key of ambiguousKeys) byKey.delete(key);
  return { byKey, ambiguousKeys };
}

async function buildOutput(): Promise<{
  records: CityRentMetroRecord[];
  stats: Record<string, number>;
  examples: Record<string, string[]>;
  sourceRows: Record<string, number>;
}> {
  const rawLocations = readEnvelopeRecords<LocationCrosswalkRow>('location_crosswalk.json');
  const dedupedLocations = dedupeLocations(rawLocations);
  const locations = dedupedLocations.records;
  const { byKey: cityAffordability, ambiguousKeys } = buildCityAffordabilityIndex();
  const bls = await buildBlsMetroIndex();
  const zillow = await buildZillowMetroIndex();

  const records: CityRentMetroRecord[] = [];
  const examples: Record<string, string[]> = {
    unmatched_bls: [],
    unmatched_zillow: [],
    ambiguous_bls: [],
    ambiguous_zillow: [],
    ambiguous_city_affordability: []
  };

  let blsMatched = 0;
  let zillowMatched = 0;
  let cityAffordabilityMatched = 0;
  let ambiguousBls = 0;
  let ambiguousZillow = 0;

  for (const loc of locations) {
    const state = stateCode(loc.state_code) ?? stateCode(loc.state);
    if (!loc.city || !state) continue;

    const key = cityStateKey(loc.city, state);
    const cityRow = cityAffordability.get(key) ?? null;
    if (cityRow) cityAffordabilityMatched += 1;
    if (ambiguousKeys.has(key) && examples.ambiguous_city_affordability.length < 8) {
      examples.ambiguous_city_affordability.push(`${loc.city}, ${state}`);
    }

    const blsCandidates = bls.index.get(key);
    const zillowCandidates = zillow.index.get(key);
    const blsMetro = uniqueCandidate(blsCandidates);
    const zillowMetro = uniqueCandidate(zillowCandidates);

    if (blsCandidates?.length && !blsMetro) {
      ambiguousBls += 1;
      if (examples.ambiguous_bls.length < 8) examples.ambiguous_bls.push(`${loc.city}, ${state}`);
    }
    if (zillowCandidates?.length && !zillowMetro) {
      ambiguousZillow += 1;
      if (examples.ambiguous_zillow.length < 8) examples.ambiguous_zillow.push(`${loc.city}, ${state}`);
    }
    if (!blsCandidates?.length && examples.unmatched_bls.length < 8) {
      examples.unmatched_bls.push(`${loc.city}, ${state}`);
    }
    if (!zillowCandidates?.length && examples.unmatched_zillow.length < 8) {
      examples.unmatched_zillow.push(`${loc.city}, ${state}`);
    }

    if (blsMetro) blsMatched += 1;
    if (zillowMetro) zillowMatched += 1;

    const metroName =
      blsMetro?.metro_name ??
      zillowMetro?.metro_name ??
      null;
    const metroCode =
      blsMetro?.metro_code ??
      zillowMetro?.metro_code ??
      null;

    let sources = ['location_crosswalk'];
    for (const source of cityRow?.sources ?? []) sources = addSource(sources, source);
    if (cityRow?.hud_fmr_1br != null || cityRow?.hud_fmr_2br != null) {
      sources = addSource(sources, 'hud_fmr');
    }
    if (blsMetro) sources = addSource(sources, 'bls_metro');
    if (zillowMetro) sources = addSource(sources, 'zillow_zori');

    const partial = {
      zillow_latest_rent: zillowMetro?.zillow_latest_rent ?? null,
      hud_fmr_1br: cityRow?.hud_fmr_1br ?? null,
      hud_fmr_2br: cityRow?.hud_fmr_2br ?? null,
      bls_median_wage: blsMetro?.bls_median_wage ?? null,
      metro_name: metroName
    };

    records.push({
      city_key: key,
      city: loc.city,
      state: STATE_CODE_TO_NAME[state] ?? state,
      state_code: state,
      county: loc.county ?? cityRow?.county ?? null,
      county_fips:
        loc.county_fips != null
          ? String(loc.county_fips)
          : cityRow?.county_fips != null
            ? String(cityRow.county_fips)
            : null,
      metro_name: metroName,
      metro_code: blsMetro?.metro_code ?? null,
      lat: loc.lat ?? cityRow?.lat ?? null,
      lng: loc.lng ?? cityRow?.lng ?? null,
      population: loc.population ?? cityRow?.population ?? null,
      hud_fmr_1br: cityRow?.hud_fmr_1br ?? null,
      hud_fmr_2br: cityRow?.hud_fmr_2br ?? null,
      zillow_latest_rent: zillowMetro?.zillow_latest_rent ?? null,
      zillow_rent_12mo_change_pct:
        zillowMetro?.zillow_rent_12mo_change_pct ?? null,
      zillow_latest_month: zillowMetro?.zillow_latest_month ?? null,
      bls_median_wage: blsMetro?.bls_median_wage ?? null,
      bls_mean_wage: blsMetro?.bls_mean_wage ?? null,
      bls_employment: blsMetro?.bls_employment ?? null,
      bls_year: blsMetro?.bls_year ?? null,
      rent_context: rentContext(partial),
      wage_context: wageContext(partial),
      source_years: sourceYears(cityRow, blsMetro, zillowMetro),
      sources
    });
  }

  records.sort(
    (a, b) =>
      a.state_code.localeCompare(b.state_code) ||
      a.city.localeCompare(b.city) ||
      a.city_key.localeCompare(b.city_key)
  );

  return {
    records,
    stats: {
      location_rows: locations.length,
      location_raw_rows: rawLocations.length,
      location_duplicate_city_keys_hidden: dedupedLocations.duplicateCityKeys,
      output_rows: records.length,
      city_affordability_matched: cityAffordabilityMatched,
      bls_matched: blsMatched,
      zillow_matched: zillowMatched,
      ambiguous_city_affordability: ambiguousKeys.size,
      ambiguous_bls: ambiguousBls,
      ambiguous_zillow: ambiguousZillow
    },
    examples,
    sourceRows: {
      bls_rows_read: bls.rowsRead,
      bls_all_occupation_rows: bls.allOccupationRows,
      zillow_rows_read: zillow.rowsRead,
      zillow_usable_rows: zillow.usableRows
    }
  };
}

function writeOutputBuildReport(args: {
  outputBytes: number;
  stats: Record<string, number>;
  examples: Record<string, string[]>;
  sourceRows: Record<string, number>;
}): void {
  const lines = [
    '# D9 Output Build Report',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    '## Output',
    '',
    `- File: \`${OUTPUT_FILE}\``,
    `- Rows: ${args.stats.output_rows.toLocaleString('en-US')}`,
    `- Size: ${formatMb(args.outputBytes)} MB`,
    '',
    '## Coverage',
    '',
    `- Raw location rows: ${args.stats.location_raw_rows.toLocaleString('en-US')}`,
    `- Base location rows after strict city_key dedupe: ${args.stats.location_rows.toLocaleString('en-US')}`,
    `- Duplicate location city keys hidden: ${args.stats.location_duplicate_city_keys_hidden.toLocaleString('en-US')}`,
    `- city/state rows with existing affordability match: ${args.stats.city_affordability_matched.toLocaleString('en-US')}`,
    `- BLS metro rows read: ${args.sourceRows.bls_rows_read.toLocaleString('en-US')}`,
    `- BLS all-occupation metro rows used: ${args.sourceRows.bls_all_occupation_rows.toLocaleString('en-US')}`,
    `- BLS metro matched city rows: ${args.stats.bls_matched.toLocaleString('en-US')}`,
    `- Zillow rows read: ${args.sourceRows.zillow_rows_read.toLocaleString('en-US')}`,
    `- Zillow usable metro rows: ${args.sourceRows.zillow_usable_rows.toLocaleString('en-US')}`,
    `- Zillow matched city rows: ${args.stats.zillow_matched.toLocaleString('en-US')}`,
    `- Ambiguous city affordability keys hidden: ${args.stats.ambiguous_city_affordability.toLocaleString('en-US')}`,
    `- Ambiguous BLS city/metro matches hidden: ${args.stats.ambiguous_bls.toLocaleString('en-US')}`,
    `- Ambiguous Zillow city/metro matches hidden: ${args.stats.ambiguous_zillow.toLocaleString('en-US')}`,
    '',
    '## Examples',
    '',
    `- Unmatched BLS examples: ${args.examples.unmatched_bls.join('; ') || 'none'}`,
    `- Unmatched Zillow examples: ${args.examples.unmatched_zillow.join('; ') || 'none'}`,
    `- Ambiguous BLS examples: ${args.examples.ambiguous_bls.join('; ') || 'none'}`,
    `- Ambiguous Zillow examples: ${args.examples.ambiguous_zillow.join('; ') || 'none'}`,
    `- Ambiguous city affordability examples: ${args.examples.ambiguous_city_affordability.join('; ') || 'none'}`,
    '',
    '## Source Files Used',
    '',
    '- Existing local `city_affordability.json` for compact HUD FMR fields.',
    '- Existing local `location_crosswalk.json` for city/state identity.',
    '- Customer package `bls_metro.jsonl.gz` streamed read-only for all-occupation metro wage aggregates.',
    '- Customer package `zillow_zori.jsonl.gz` streamed read-only for latest metro rent and 12-month change.',
    '',
    'No raw customer package files, full BLS occupation tables, or full Zillow monthly series are shipped.'
  ];

  fs.writeFileSync(
    path.join(REPORT_DIR, 'd9-output-build-report.md'),
    `${lines.join('\n')}\n`,
    'utf8'
  );
}

async function main(): Promise<void> {
  ensureDirs();
  writeCsv(path.join(REPORT_DIR, 'd9-resolved-input-files.csv'), resolvedInputRows());

  const { records, stats, examples, sourceRows } = await buildOutput();
  writeEnvelope(OUTPUT_FILE, records);

  const outputPath = path.join(DATA_DIR, OUTPUT_FILE);
  const outputBytes = fs.statSync(outputPath).size;
  if (outputBytes > 10 * 1024 * 1024) {
    throw new Error(`${OUTPUT_FILE} exceeded 10 MB hard stop`);
  }

  writeOutputBuildReport({ outputBytes, stats, examples, sourceRows });

  console.log(
    `${OUTPUT_FILE}: ${records.length.toLocaleString('en-US')} rows, ${formatMb(outputBytes)} MB`
  );
  console.log(
    `BLS matched ${stats.bls_matched.toLocaleString('en-US')} rows; Zillow matched ${stats.zillow_matched.toLocaleString('en-US')} rows; city/state matched ${stats.city_affordability_matched.toLocaleString('en-US')} rows.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
