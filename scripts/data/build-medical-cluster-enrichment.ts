import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

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

type Envelope<T> = {
  meta: {
    generated_at: string;
    generated_by: string;
    permission_status: string;
    output_policy: string;
  };
  records: T[];
};

type MedicalSchoolEnrichmentRecord = {
  school_key: string;
  name: string;
  normalized_name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  school_type?: 'MD' | 'DO' | 'international' | 'unknown';
  accreditor?: 'LCME' | 'COCA' | 'AACOM' | 'WDOMS' | 'unknown';
  accreditation_status?: string | null;
  website?: string | null;
  ror_id?: string | null;
  openalex_id?: string | null;
  scorecard_unit_id?: string | null;
  admit_stats_available?: boolean | null;
  admit_applicant_count?: number | null;
  admit_acceptance_context?: string | null;
  nih_project_count?: number | null;
  openalex_works_count?: number | null;
  research_context?: string | null;
  source_years?: Record<string, string | number>;
  sources: string[];
};

type HealthWorkforceContextRecord = {
  state_code: string;
  state_name: string;
  healthcare_median_wage?: number | null;
  nursing_median_wage?: number | null;
  physician_assistant_median_wage?: number | null;
  medical_assistant_median_wage?: number | null;
  hpsa_context?: string | null;
  hpsa_count?: number | null;
  workforce_context?: string | null;
  source_years?: Record<string, string | number>;
  sources: string[];
};

type PremedTopicContextRecord = {
  topic_key: string;
  topic: string;
  page_targets: string[];
  relevant_sources: string[];
  suggested_context_copy: string;
  related_links: Array<{ label: string; href: string }>;
  data_points?: Array<{
    label: string;
    value?: string | number | null;
    source: string;
  }>;
  display_policy: {
    no_eligibility_claims: true;
    no_rankings: true;
    no_admissions_advice_as_guarantee: true;
  };
};

const ROOT = process.cwd();
const PACKAGE_ROOT =
  'C:\\dev\\adek\\customer_package\\medresidency_data_package_2026-05-29';
const DATA_DIR = path.join(ROOT, 'data/external/scholarshiptop-enrichment');
const REPORT_DIR = path.join(ROOT, 'reports/data');
const PERMISSION_STATUS = 'permission_received_per_user_statement';

const PATHS = {
  wdoms_us_medical_schools: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/03_newly_collected_sources/wdoms_us_medical_schools/normalized/wdoms_us_medical_schools.jsonl'
  ),
  aacom_osteopathic_medical_schools: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/03_newly_collected_sources/aacom_osteopathic_medical_schools/normalized/aacom_osteopathic_medical_schools.jsonl'
  ),
  lcme: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/03_newly_collected_sources/lcme/normalized/lcme.jsonl'
  ),
  coca: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/02_local_normalized_sources/coca/normalized/coca.jsonl'
  ),
  admit_med_school_stats: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/03_newly_collected_sources/admit_med_school_stats/admit_med_school_stats.jsonl'
  ),
  hrsa_hpsa: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/03_newly_collected_sources/hrsa_hpsa/normalized/hrsa_hpsa.jsonl'
  ),
  bls_state_oes: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/03_newly_collected_sources/bls_state_oes/normalized/bls_state_oes.jsonl'
  ),
  bls_metro: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/01_legacy_supabase_exports/bls_metro/bls_metro.jsonl.gz'
  ),
  nih_reporter: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/03_newly_collected_sources/nih_reporter/normalized/nih_reporter.jsonl'
  ),
  openalex: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/02_local_normalized_sources/openalex/normalized/openalex.jsonl'
  ),
  ror: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/01_legacy_supabase_exports/ror/ror.jsonl.gz'
  ),
  college_scorecard: path.join(
    PACKAGE_ROOT,
    '04_data_deliverable/03_newly_collected_sources/college_scorecard/normalized/college_scorecard.jsonl'
  ),
  institution_research_enrichment: path.join(DATA_DIR, 'institution_research_enrichment.json'),
  school_enrichment: path.join(DATA_DIR, 'school_enrichment.json'),
  state_affordability: path.join(DATA_DIR, 'state_affordability.json'),
  state_social_context: path.join(DATA_DIR, 'state_social_context.json')
} as const;

const ESTIMATED_ROWS: Record<keyof typeof PATHS, string> = {
  wdoms_us_medical_schools: '222',
  aacom_osteopathic_medical_schools: '74',
  lcme: '163',
  coca: 'COCA local normalized',
  admit_med_school_stats: '709',
  hrsa_hpsa: '163973',
  bls_state_oes: '34109',
  bls_metro: '150176',
  nih_reporter: '2503896',
  openalex: 'local normalized',
  ror: 'legacy gz export',
  college_scorecard: '6322',
  institution_research_enrichment: '2323',
  school_enrichment: '6197',
  state_affordability: '52',
  state_social_context: '52'
};

const STATE_NAME_TO_CODE: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  'District of Columbia': 'DC',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Puerto Rico': 'PR',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY'
};

const STATE_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAME_TO_CODE).map(([name, code]) => [code, name])
);
const STATE_CODES = new Set(Object.values(STATE_NAME_TO_CODE));

const HEALTH_OCCUPATION_CODES = {
  healthcare: '29-0000',
  nursing: '29-1141',
  physicianAssistant: '29-1071',
  medicalAssistant: '31-9092'
};

function ensureDirs(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

function payload(row: unknown): JsonObject {
  if (!row || typeof row !== 'object') return {};
  const obj = row as JsonObject;
  return obj.payload && typeof obj.payload === 'object'
    ? (obj.payload as JsonObject)
    : obj;
}

function stringValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/\b(the)\b/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value: string): string {
  return normalizeName(value).replace(/\s+/g, '-').replace(/^-|-$/g, '');
}

function normalizeState(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (STATE_CODES.has(upper)) return upper;
  const exact = STATE_NAME_TO_CODE[raw];
  if (exact) return exact;
  const lower = raw.toLowerCase();
  const found = Object.entries(STATE_NAME_TO_CODE).find(
    ([name]) => name.toLowerCase() === lower
  );
  return found?.[1] ?? null;
}

function extractStateFromAddress(address: string | null): string | null {
  if (!address) return null;
  const codes = [...STATE_CODES].join('|');
  const zipMatch = address.match(new RegExp(`\\b(${codes})\\s+\\d{5}(?:-\\d{4})?\\b`));
  if (zipMatch?.[1]) return zipMatch[1];
  const commaMatch = address.match(new RegExp(`,\\s*(${codes})\\b`));
  return commaMatch?.[1] ?? null;
}

function nameStateKey(name: string, state: string | null | undefined): string | null {
  const normalized = normalizeName(name);
  const stateCode = normalizeState(state);
  return normalized && stateCode ? `${normalized}|${stateCode}` : null;
}

function nameCityCountryKey(
  name: string,
  city: string | null | undefined,
  country: string | null | undefined
): string | null {
  const normalized = normalizeName(name);
  const cityKey = city ? normalizeName(city) : '';
  const countryKey = country ? normalizeName(country) : '';
  return normalized && cityKey && countryKey
    ? `${normalized}|${cityKey}|${countryKey}`
    : null;
}

function unionSources(existing: string[], incoming: string[]): string[] {
  return [...new Set([...existing, ...incoming])].sort();
}

function mergeYearMap(
  existing: Record<string, string | number> | undefined,
  incoming: Record<string, string | number> | undefined
): Record<string, string | number> | undefined {
  const merged = { ...(existing ?? {}), ...(incoming ?? {}) };
  return Object.keys(merged).length ? merged : undefined;
}

function preferAccreditor(
  current: MedicalSchoolEnrichmentRecord['accreditor'],
  next: MedicalSchoolEnrichmentRecord['accreditor']
): MedicalSchoolEnrichmentRecord['accreditor'] {
  const priority = ['unknown', 'WDOMS', 'AACOM', 'COCA', 'LCME'];
  const currentScore = priority.indexOf(current ?? 'unknown');
  const nextScore = priority.indexOf(next ?? 'unknown');
  return nextScore > currentScore ? next : current;
}

function mergeMedicalRecord(
  base: MedicalSchoolEnrichmentRecord,
  incoming: MedicalSchoolEnrichmentRecord
): MedicalSchoolEnrichmentRecord {
  const schoolType = base.school_type === 'unknown' ? incoming.school_type : base.school_type;
  return {
    ...base,
    city: base.city ?? incoming.city ?? null,
    state: base.state ?? incoming.state ?? null,
    country: base.country ?? incoming.country ?? null,
    school_type: schoolType ?? incoming.school_type ?? 'unknown',
    accreditor: preferAccreditor(base.accreditor, incoming.accreditor),
    accreditation_status: base.accreditation_status ?? incoming.accreditation_status ?? null,
    website: base.website ?? incoming.website ?? null,
    ror_id: base.ror_id ?? incoming.ror_id ?? null,
    openalex_id: base.openalex_id ?? incoming.openalex_id ?? null,
    scorecard_unit_id: base.scorecard_unit_id ?? incoming.scorecard_unit_id ?? null,
    admit_stats_available:
      base.admit_stats_available ?? incoming.admit_stats_available ?? null,
    admit_applicant_count:
      base.admit_applicant_count ?? incoming.admit_applicant_count ?? null,
    admit_acceptance_context:
      base.admit_acceptance_context ?? incoming.admit_acceptance_context ?? null,
    nih_project_count: base.nih_project_count ?? incoming.nih_project_count ?? null,
    openalex_works_count: base.openalex_works_count ?? incoming.openalex_works_count ?? null,
    research_context: base.research_context ?? incoming.research_context ?? null,
    source_years: mergeYearMap(base.source_years, incoming.source_years),
    sources: unionSources(base.sources, incoming.sources)
  };
}

async function readJsonl(
  filePath: string,
  onRow: (row: JsonObject, lineNumber: number) => void
): Promise<number> {
  if (!fs.existsSync(filePath)) return 0;
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity
  });

  let count = 0;
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    count += 1;
    try {
      onRow(JSON.parse(trimmed) as JsonObject, count);
    } catch {
      // Keep the build resilient; validation/reporting stays aggregate-only.
    }
  }
  return count;
}

function readEnvelopeRecords<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { records?: T[] };
  return Array.isArray(parsed.records) ? parsed.records : [];
}

function writeJson<T>(filename: string, records: T[], outputPolicy: string): void {
  const envelope: Envelope<T> = {
    meta: {
      generated_at: new Date().toISOString(),
      generated_by: 'scripts/data/build-medical-cluster-enrichment.ts',
      permission_status: PERMISSION_STATUS,
      output_policy: outputPolicy
    },
    records
  };
  fs.writeFileSync(path.join(DATA_DIR, filename), `${JSON.stringify(envelope, null, 2)}\n`);
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filename: string, rows: InputFileReportRow[]): void {
  const headers: Array<keyof InputFileReportRow> = [
    'source_name',
    'input_path',
    'exists',
    'format',
    'size_mb',
    'estimated_rows',
    'read_method',
    'will_use_now',
    'reason'
  ];
  const body = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','))
  ].join('\n');
  fs.writeFileSync(path.join(REPORT_DIR, filename), `${body}\n`);
}

function resolveInputRows(): InputFileReportRow[] {
  const formats: Partial<Record<keyof typeof PATHS, string>> = {
    bls_metro: 'jsonl.gz',
    ror: 'jsonl.gz',
    institution_research_enrichment: 'static_json',
    school_enrichment: 'static_json',
    state_affordability: 'static_json',
    state_social_context: 'static_json'
  };
  const useNow: Partial<Record<keyof typeof PATHS, [string, string, string]>> = {
    wdoms_us_medical_schools: [
      'yes',
      'stream_jsonl',
      'Base U.S. medical school directory context, aggregate fields only'
    ],
    aacom_osteopathic_medical_schools: [
      'yes',
      'stream_jsonl',
      'Official DO school directory context; no raw map/PDF copied'
    ],
    lcme: ['yes', 'stream_jsonl', 'Official MD accreditation status context'],
    coca: ['yes', 'stream_jsonl', 'Official DO accreditation status context'],
    admit_med_school_stats: [
      'yes',
      'stream_jsonl_global_rows_only',
      'Only applicant count and availability context retained'
    ],
    hrsa_hpsa: [
      'yes',
      'stream_jsonl_aggregate_state_counts',
      'State-level HPSA count only; raw rows not shipped'
    ],
    bls_state_oes: [
      'yes',
      'stream_jsonl_selected_health_occupations',
      'State-level median wage context for health workforce topics'
    ],
    bls_metro: ['no', 'not_read', 'D9 already handles metro wage context; D10 stays state-level'],
    nih_reporter: [
      'indirect_aggregate',
      'reuse_institution_research_enrichment',
      'Raw NIH project rows are too large and include project fields; D10 reuses D8 aggregate-only output'
    ],
    openalex: [
      'indirect_aggregate',
      'reuse_institution_research_enrichment',
      'OpenAlex identity and works counts already aggregated in D8 output'
    ],
    ror: [
      'indirect_aggregate',
      'reuse_institution_research_enrichment',
      'ROR identity already aggregated in D8 output'
    ],
    college_scorecard: [
      'indirect_static',
      'reuse_school_enrichment',
      'Scorecard identity joins use existing static school enrichment'
    ],
    institution_research_enrichment: [
      'yes',
      'read_small_static_json',
      'D8 aggregate-only OpenAlex/ROR/NIH research context'
    ],
    school_enrichment: [
      'yes',
      'read_small_static_json',
      'Existing Scorecard static identity layer for strict unit_id joins'
    ],
    state_affordability: [
      'yes',
      'read_small_static_json',
      'State row skeleton and names'
    ],
    state_social_context: [
      'yes',
      'read_small_static_json',
      'Optional future topic context; not copied into D10 outputs'
    ]
  };

  return Object.entries(PATHS).map(([name, inputPath]) => {
    const sourceName = name as keyof typeof PATHS;
    const stat = fs.existsSync(inputPath) ? fs.statSync(inputPath) : null;
    const [willUse, readMethod, reason] = useNow[sourceName] ?? [
      'no',
      'not_read',
      'Not needed for D10'
    ];
    return {
      source_name: sourceName,
      input_path: inputPath,
      exists: Boolean(stat),
      format: formats[sourceName] ?? 'jsonl',
      size_mb: stat ? (stat.size / 1024 / 1024).toFixed(2) : '0',
      estimated_rows: ESTIMATED_ROWS[sourceName],
      read_method: readMethod,
      will_use_now: willUse,
      reason
    };
  });
}

function finalSchoolKey(row: MedicalSchoolEnrichmentRecord): string {
  const state = row.state ? row.state.toLowerCase() : row.country ? slug(row.country) : 'unknown';
  const city = row.city ? `-${slug(row.city)}` : '';
  return `${slug(row.name)}-${state}${city}`.replace(/-+/g, '-');
}

async function buildMedicalSchoolEnrichment(): Promise<{
  records: MedicalSchoolEnrichmentRecord[];
  stats: Record<string, number>;
  ambiguousExamples: string[];
}> {
  const recordsById = new Map<string, MedicalSchoolEnrichmentRecord>();
  const byNameState = new Map<string, string>();
  const byNameCityCountry = new Map<string, string>();
  const bySourceAlias = new Map<string, string>();
  const stats: Record<string, number> = {
    lcme_rows: 0,
    coca_rows: 0,
    aacom_rows: 0,
    wdoms_rows: 0,
    admit_global_rows: 0,
    admit_matched: 0,
    research_matched: 0,
    scorecard_matched: 0
  };
  const ambiguousExamples: string[] = [];

  function addOrMerge(
    incoming: MedicalSchoolEnrichmentRecord,
    aliasKeys: string[] = []
  ): MedicalSchoolEnrichmentRecord {
    const nsKey = nameStateKey(incoming.name, incoming.state);
    const ncKey = nameCityCountryKey(incoming.name, incoming.city, incoming.country);
    const aliasMatch = aliasKeys.map((key) => bySourceAlias.get(key)).find(Boolean);
    const existingId =
      aliasMatch ??
      (nsKey ? byNameState.get(nsKey) : undefined) ??
      (ncKey ? byNameCityCountry.get(ncKey) : undefined);

    if (existingId) {
      const merged = mergeMedicalRecord(recordsById.get(existingId)!, incoming);
      recordsById.set(existingId, merged);
      for (const aliasKey of aliasKeys) bySourceAlias.set(aliasKey, existingId);
      return merged;
    }

    const id = incoming.school_key;
    recordsById.set(id, incoming);
    if (nsKey) byNameState.set(nsKey, id);
    if (ncKey) byNameCityCountry.set(ncKey, id);
    for (const aliasKey of aliasKeys) bySourceAlias.set(aliasKey, id);
    return incoming;
  }

  await readJsonl(PATHS.lcme, (row) => {
    const name = stringValue(row.program_name);
    if (!name) return;
    const state = normalizeState(stringValue(row.state));
    const city = stringValue(row.city);
    stats.lcme_rows += 1;
    addOrMerge({
      school_key: finalSchoolKey({ name, normalized_name: normalizeName(name), state, city, sources: [] }),
      name,
      normalized_name: normalizeName(name),
      city,
      state,
      country: 'United States',
      school_type: 'MD',
      accreditor: 'LCME',
      accreditation_status: stringValue(row.accreditation_status),
      source_years: { lcme: 2026 },
      sources: ['LCME']
    });
  });

  await readJsonl(PATHS.coca, (row) => {
    const p = payload(row);
    const name = stringValue(p.institution_name);
    if (!name) return;
    const state = normalizeState(stringValue(p.state));
    const city = stringValue(p.city);
    const siteKey = stringValue(p.site_key);
    stats.coca_rows += 1;
    addOrMerge(
      {
        school_key: finalSchoolKey({ name, normalized_name: normalizeName(name), state, city, sources: [] }),
        name,
        normalized_name: normalizeName(name),
        city,
        state,
        country: 'United States',
        school_type: 'DO',
        accreditor: 'COCA',
        accreditation_status: stringValue(p.accreditation_status),
        website: stringValue(p.website_url),
        source_years: { coca: 2026 },
        sources: ['COCA']
      },
      siteKey ? [`do-site:${siteKey.toUpperCase()}`] : []
    );
  });

  await readJsonl(PATHS.aacom_osteopathic_medical_schools, (row) => {
    const name = stringValue(row.college_name);
    if (!name) return;
    const state = normalizeState(stringValue(row.state));
    const city = stringValue(row.city);
    const shortName = stringValue(row.short_name);
    stats.aacom_rows += 1;
    addOrMerge(
      {
        school_key: finalSchoolKey({ name, normalized_name: normalizeName(name), state, city, sources: [] }),
        name,
        normalized_name: normalizeName(name),
        city,
        state,
        country: 'United States',
        school_type: 'DO',
        accreditor: 'AACOM',
        accreditation_status: null,
        website: stringValue(row.website),
        source_years: { aacom: 2026 },
        sources: ['AACOM']
      },
      shortName ? [`do-site:${shortName.toUpperCase()}`] : []
    );
  });

  await readJsonl(PATHS.wdoms_us_medical_schools, (row) => {
    const name = stringValue(row.school_name);
    if (!name) return;
    const city = stringValue(row.city);
    const country = stringValue(row.country) ?? 'United States';
    const state = extractStateFromAddress(stringValue(row.main_address));
    stats.wdoms_rows += 1;
    addOrMerge({
      school_key: finalSchoolKey({ name, normalized_name: normalizeName(name), state, city, country, sources: [] }),
      name,
      normalized_name: normalizeName(name),
      city,
      state,
      country,
      school_type: /\bM\.?D\.?\b|Doctor of Medicine/i.test(
        stringValue(row.qualification_title) ?? ''
      )
        ? 'MD'
        : 'unknown',
      accreditor: 'WDOMS',
      accreditation_status:
        stringValue(row.operational_status) === 'Currently operational'
          ? 'Currently operational'
          : stringValue(row.operational_status),
      source_years: { wdoms: 2026 },
      sources: ['WDOMS']
    });
  });

  await readJsonl(PATHS.admit_med_school_stats, (row) => {
    if (stringValue(row.filter_by) !== 'GLOBAL') return;
    const name = stringValue(row.school_name);
    const state = normalizeState(stringValue(row.school_state));
    if (!name || !state) return;
    stats.admit_global_rows += 1;
    const key = nameStateKey(name, state);
    const id = key ? byNameState.get(key) : undefined;
    if (!id) return;
    const current = recordsById.get(id)!;
    recordsById.set(id, {
      ...current,
      admit_stats_available: true,
      admit_applicant_count: numberValue(row.application_number),
      admit_acceptance_context:
        'Public admissions volume context is available; use it as planning context only, not as admissions advice or a selection guarantee.',
      source_years: mergeYearMap(current.source_years, { admit_med_school_stats: 2026 }),
      sources: unionSources(current.sources, ['Admit med school stats'])
    });
    stats.admit_matched += 1;
  });

  const researchRows = readEnvelopeRecords<JsonObject>(PATHS.institution_research_enrichment);
  const researchByNameState = new Map<string, JsonObject[]>();
  for (const row of researchRows) {
    const name = stringValue(row.name);
    const state = normalizeState(stringValue(row.state));
    if (!name || !state) continue;
    const key = nameStateKey(name, state);
    if (!key) continue;
    const matches = researchByNameState.get(key) ?? [];
    matches.push(row);
    researchByNameState.set(key, matches);
  }

  const scorecardRows = readEnvelopeRecords<JsonObject>(PATHS.school_enrichment);
  const scorecardByNameState = new Map<string, JsonObject[]>();
  for (const row of scorecardRows) {
    const name = stringValue(row.school_name);
    const state = normalizeState(stringValue(row.state));
    if (!name || !state) continue;
    const key = nameStateKey(name, state);
    if (!key) continue;
    const matches = scorecardByNameState.get(key) ?? [];
    matches.push(row);
    scorecardByNameState.set(key, matches);
  }

  for (const [id, row] of recordsById) {
    const key = nameStateKey(row.name, row.state);
    if (!key) continue;

    const researchMatches = researchByNameState.get(key) ?? [];
    if (researchMatches.length === 1) {
      const research = researchMatches[0]!;
      recordsById.set(id, {
        ...recordsById.get(id)!,
        ror_id: stringValue(research.ror_id),
        openalex_id: stringValue(research.openalex_id),
        nih_project_count: numberValue(research.nih_project_count),
        openalex_works_count: numberValue(research.works_count),
        research_context:
          'Public research indicators are available as institution context; they do not imply scholarship eligibility.',
        source_years: mergeYearMap(recordsById.get(id)!.source_years, {
          openalex: 2026,
          ror: 2026,
          nih_reporter: 'aggregate'
        }),
        sources: unionSources(recordsById.get(id)!.sources, [
          'OpenAlex aggregate',
          'ROR aggregate',
          'NIH RePORTER aggregate'
        ])
      });
      stats.research_matched += 1;
    } else if (researchMatches.length > 1 && ambiguousExamples.length < 5) {
      ambiguousExamples.push(`research:${key}`);
    }

    const scorecardMatches = scorecardByNameState.get(key) ?? [];
    if (scorecardMatches.length === 1) {
      const school = scorecardMatches[0]!;
      recordsById.set(id, {
        ...recordsById.get(id)!,
        scorecard_unit_id: stringValue(school.unit_id),
        website: recordsById.get(id)!.website ?? stringValue(school.website),
        source_years: mergeYearMap(recordsById.get(id)!.source_years, {
          college_scorecard: 2026
        }),
        sources: unionSources(recordsById.get(id)!.sources, ['College Scorecard'])
      });
      stats.scorecard_matched += 1;
    } else if (scorecardMatches.length > 1 && ambiguousExamples.length < 5) {
      ambiguousExamples.push(`scorecard:${key}`);
    }
  }

  const records = [...recordsById.values()]
    .map((row) => ({
      ...row,
      school_key: finalSchoolKey(row),
      normalized_name: normalizeName(row.name),
      source_years: row.source_years ?? undefined,
      sources: row.sources.sort()
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { records, stats, ambiguousExamples };
}

async function buildHealthWorkforceContext(): Promise<{
  records: HealthWorkforceContextRecord[];
  stats: Record<string, number>;
}> {
  const stateRows = readEnvelopeRecords<JsonObject>(PATHS.state_affordability);
  const byState = new Map<string, HealthWorkforceContextRecord>();
  for (const stateRow of stateRows) {
    const stateCode = normalizeState(stringValue(stateRow.state_code));
    if (!stateCode) continue;
    byState.set(stateCode, {
      state_code: stateCode,
      state_name: stringValue(stateRow.state) ?? STATE_CODE_TO_NAME[stateCode] ?? stateCode,
      healthcare_median_wage: null,
      nursing_median_wage: null,
      physician_assistant_median_wage: null,
      medical_assistant_median_wage: null,
      hpsa_context: null,
      hpsa_count: null,
      workforce_context: null,
      source_years: { bls_state_oes: 2025, hrsa_hpsa: 2026 },
      sources: []
    });
  }

  const stats: Record<string, number> = {
    bls_rows_read: 0,
    bls_selected_rows: 0,
    states_with_bls_healthcare: 0,
    states_with_bls_nursing: 0,
    states_with_hpsa: 0,
    hpsa_rows_read: 0,
    hpsa_designated_rows: 0
  };

  await readJsonl(PATHS.bls_state_oes, (row) => {
    stats.bls_rows_read += 1;
    const occupationCode =
      stringValue(row.formatted_occupation_code) ?? stringValue(row.occupation_code);
    if (!occupationCode) return;
    const stateCode = normalizeState(stringValue(row.area_name));
    if (!stateCode || !byState.has(stateCode)) return;
    const target = byState.get(stateCode)!;
    const values = row.values && typeof row.values === 'object' ? (row.values as JsonObject) : {};
    const median = numberValue(values.annual_median_wage);
    if (median == null) return;

    if (occupationCode === HEALTH_OCCUPATION_CODES.healthcare) {
      target.healthcare_median_wage = median;
      stats.bls_selected_rows += 1;
    }
    if (occupationCode === HEALTH_OCCUPATION_CODES.nursing) {
      target.nursing_median_wage = median;
      stats.bls_selected_rows += 1;
    }
    if (occupationCode === HEALTH_OCCUPATION_CODES.physicianAssistant) {
      target.physician_assistant_median_wage = median;
      stats.bls_selected_rows += 1;
    }
    if (occupationCode === HEALTH_OCCUPATION_CODES.medicalAssistant) {
      target.medical_assistant_median_wage = median;
      stats.bls_selected_rows += 1;
    }
    if (
      occupationCode === HEALTH_OCCUPATION_CODES.healthcare ||
      occupationCode === HEALTH_OCCUPATION_CODES.nursing ||
      occupationCode === HEALTH_OCCUPATION_CODES.physicianAssistant ||
      occupationCode === HEALTH_OCCUPATION_CODES.medicalAssistant
    ) {
      target.sources = unionSources(target.sources, ['BLS OEWS state']);
    }
  });

  const hpsaByState = new Map<string, Set<string>>();
  await readJsonl(PATHS.hrsa_hpsa, (row) => {
    stats.hpsa_rows_read += 1;
    const p = payload(row);
    if (stringValue(p.status) !== 'Designated') return;
    const stateCode = normalizeState(stringValue(p.state));
    const hpsaId = stringValue(p.hpsa_id);
    if (!stateCode || !hpsaId || !byState.has(stateCode)) return;
    stats.hpsa_designated_rows += 1;
    const discipline = stringValue(p.discipline) ?? 'hpsa';
    const ids = hpsaByState.get(stateCode) ?? new Set<string>();
    ids.add(`${discipline}:${hpsaId}`);
    hpsaByState.set(stateCode, ids);
  });

  for (const [stateCode, ids] of hpsaByState) {
    const row = byState.get(stateCode);
    if (!row) continue;
    row.hpsa_count = ids.size;
    row.hpsa_context =
      'HRSA HPSA designation counts are public workforce planning context; they do not determine scholarship eligibility.';
    row.sources = unionSources(row.sources, ['HRSA HPSA aggregate']);
  }

  for (const row of byState.values()) {
    if (row.healthcare_median_wage != null) stats.states_with_bls_healthcare += 1;
    if (row.nursing_median_wage != null) stats.states_with_bls_nursing += 1;
    if (row.hpsa_count != null) stats.states_with_hpsa += 1;
    row.workforce_context =
      'Use public wage and shortage-designation context alongside scholarship amount, program cost, and official provider requirements.';
    if (row.sources.length === 0) row.sources = ['State affordability baseline'];
  }

  return {
    records: [...byState.values()].sort((a, b) => a.state_name.localeCompare(b.state_name)),
    stats
  };
}

function buildPremedTopicContext(input: {
  medicalSchoolCount: number;
  healthWorkforceRows: HealthWorkforceContextRecord[];
}): PremedTopicContextRecord[] {
  const statesWithNursing = input.healthWorkforceRows.filter(
    (row) => row.nursing_median_wage != null
  ).length;
  const statesWithHpsa = input.healthWorkforceRows.filter(
    (row) => row.hpsa_count != null
  ).length;

  const policy = {
    no_eligibility_claims: true,
    no_rankings: true,
    no_admissions_advice_as_guarantee: true
  } as const;

  const commonLinks = [
    { label: 'Medicine scholarships', href: '/scholarships/category/medical' },
    { label: 'Medical scholarships guide', href: '/resources/medical-scholarships-guide' },
    { label: 'Career goals essay guide', href: '/essays/career-goals' }
  ];

  const topics: PremedTopicContextRecord[] = [
    {
      topic_key: 'pre-med-scholarships',
      topic: 'Pre-med scholarships',
      page_targets: ['/resources/medical-scholarships-guide', '/scholarships/category/medical'],
      relevant_sources: ['WDOMS', 'LCME', 'College Scorecard', 'OpenAlex aggregate'],
      suggested_context_copy:
        'Pre-med scholarship planning can combine science preparation, healthcare service, research exposure, and school-cost context without implying medical school admission or award eligibility.',
      related_links: commonLinks,
      data_points: [
        {
          label: 'Medical school directory records available',
          value: input.medicalSchoolCount,
          source: 'WDOMS/LCME/COCA/AACOM aggregate'
        }
      ],
      display_policy: policy
    },
    {
      topic_key: 'medical-school-scholarships',
      topic: 'Medical school scholarships',
      page_targets: ['/resources/medical-scholarships-guide', '/scholarships/category/medical'],
      relevant_sources: ['LCME', 'COCA', 'AACOM', 'WDOMS', 'Admit med school stats'],
      suggested_context_copy:
        'Medical school scholarship context should distinguish MD, DO, and broader healthcare awards, and should point students back to official provider requirements.',
      related_links: commonLinks,
      data_points: [
        {
          label: 'MD/DO school context records available',
          value: input.medicalSchoolCount,
          source: 'medical_school_enrichment'
        }
      ],
      display_policy: policy
    },
    {
      topic_key: 'nursing-scholarships',
      topic: 'Nursing scholarships',
      page_targets: ['/resources/medical-scholarships-guide', '/scholarships/nursing'],
      relevant_sources: ['BLS OEWS state', 'HRSA HPSA aggregate'],
      suggested_context_copy:
        'Nursing scholarship planning can use state wage and workforce context as background, while official scholarship rules remain the source of truth.',
      related_links: [
        { label: 'Nursing scholarships', href: '/scholarships/nursing' },
        ...commonLinks
      ],
      data_points: [
        {
          label: 'States with nursing wage context',
          value: statesWithNursing,
          source: 'BLS OEWS state'
        }
      ],
      display_policy: policy
    },
    {
      topic_key: 'healthcare-scholarships',
      topic: 'Healthcare scholarships',
      page_targets: ['/resources/medical-scholarships-guide', '/scholarships/category/medical'],
      relevant_sources: ['BLS OEWS state', 'HRSA HPSA aggregate', 'state_affordability'],
      suggested_context_copy:
        'Healthcare scholarships can span nursing, public health, pre-med, allied health, and service-oriented paths; data should be used for planning context only.',
      related_links: commonLinks,
      data_points: [
        {
          label: 'States with HPSA aggregate context',
          value: statesWithHpsa,
          source: 'HRSA HPSA aggregate'
        }
      ],
      display_policy: policy
    },
    {
      topic_key: 'first-generation-pre-med',
      topic: 'First-generation pre-med',
      page_targets: ['/resources/medical-scholarships-guide', '/essays/career-goals'],
      relevant_sources: ['College Scorecard', 'state_affordability', 'premed_topic_context'],
      suggested_context_copy:
        'First-generation pre-med applicants can frame preparation, mentoring, cost planning, and service experience without treating data context as a promise of admission or funding.',
      related_links: [
        { label: 'First-generation scholarships', href: '/scholarships/hub/first-generation' },
        ...commonLinks
      ],
      display_policy: policy
    },
    {
      topic_key: 'financial-need-for-medical-school',
      topic: 'Financial need for medical school',
      page_targets: ['/resources/medical-scholarships-guide', '/essays/financial-need'],
      relevant_sources: ['state_affordability', 'College Scorecard', 'city_rent_metro_enrichment'],
      suggested_context_copy:
        'Financial-need examples should connect verified personal costs with public planning context, not copy public estimates as a substitute for the student story.',
      related_links: [
        { label: 'Financial need essay guide', href: '/essays/financial-need' },
        ...commonLinks
      ],
      display_policy: policy
    },
    {
      topic_key: 'stem-to-medical-career-path',
      topic: 'STEM to medical career path',
      page_targets: ['/resources/stem-scholarships-guide', '/essays/career-goals'],
      relevant_sources: ['OpenAlex aggregate', 'College Scorecard', 'premed_topic_context'],
      suggested_context_copy:
        'STEM-to-medicine context can help students connect coursework, research, patient-care goals, and scholarship fit without turning the essay into admissions advice.',
      related_links: [
        { label: 'STEM scholarships guide', href: '/resources/stem-scholarships-guide' },
        ...commonLinks
      ],
      display_policy: policy
    },
    {
      topic_key: 'rural-healthcare-scholarships',
      topic: 'Rural healthcare scholarships',
      page_targets: ['/resources/medical-scholarships-guide', '/scholarships/category/medical'],
      relevant_sources: ['HRSA HPSA aggregate', 'BLS OEWS state', 'state_social_context'],
      suggested_context_copy:
        'Rural healthcare scholarship context can mention workforce planning themes neutrally, while avoiding claims that a student qualifies because of shortage designations.',
      related_links: commonLinks,
      data_points: [
        {
          label: 'States with HPSA aggregate context',
          value: statesWithHpsa,
          source: 'HRSA HPSA aggregate'
        }
      ],
      display_policy: policy
    },
    {
      topic_key: 'underserved-communities-healthcare-workforce',
      topic: 'Underserved communities / healthcare workforce',
      page_targets: ['/resources/medical-scholarships-guide', '/essays/career-goals'],
      relevant_sources: ['HRSA HPSA aggregate', 'state_social_context', 'BLS OEWS state'],
      suggested_context_copy:
        'Use public community and workforce indicators as background for planning and reflection; do not describe communities as rankings or scholarship eligibility triggers.',
      related_links: commonLinks,
      data_points: [
        {
          label: 'States with workforce shortage context',
          value: statesWithHpsa,
          source: 'HRSA HPSA aggregate'
        }
      ],
      display_policy: policy
    }
  ];

  return topics;
}

function fileKb(filename: string): string {
  const stat = fs.statSync(path.join(DATA_DIR, filename));
  return `${(stat.size / 1024).toFixed(1)} KB`;
}

function writeBuildReport(input: {
  medicalRows: number;
  healthRows: number;
  topicRows: number;
  medicalStats: Record<string, number>;
  workforceStats: Record<string, number>;
  ambiguousExamples: string[];
  skipped: string[];
}): void {
  const report = `# D10 Output Build Report

Date: 2026-06-01
Generated by: \`scripts/data/build-medical-cluster-enrichment.ts\`

## Outputs

| Output | Rows | Size |
|---|---:|---:|
| \`medical_school_enrichment.json\` | ${input.medicalRows} | ${fileKb('medical_school_enrichment.json')} |
| \`health_workforce_context.json\` | ${input.healthRows} | ${fileKb('health_workforce_context.json')} |
| \`premed_topic_context.json\` | ${input.topicRows} | ${fileKb('premed_topic_context.json')} |

## Sources Used

- WDOMS U.S. medical schools: ${input.medicalStats.wdoms_rows} rows read
- LCME accredited MD programs: ${input.medicalStats.lcme_rows} rows read
- COCA osteopathic medical schools: ${input.medicalStats.coca_rows} rows read
- AACOM osteopathic teaching locations: ${input.medicalStats.aacom_rows} rows read
- Admit medical school stats: ${input.medicalStats.admit_global_rows} global rows read, ${input.medicalStats.admit_matched} strict matches
- BLS state OEWS: ${input.workforceStats.bls_rows_read} rows read, ${input.workforceStats.bls_selected_rows} selected health occupation rows used
- HRSA HPSA: ${input.workforceStats.hpsa_rows_read} rows read, ${input.workforceStats.hpsa_designated_rows} designated rows aggregated
- D8 institution research aggregate: ${input.medicalStats.research_matched} exact medical-school research matches
- Existing school enrichment / Scorecard: ${input.medicalStats.scorecard_matched} exact medical-school identity matches

## Match Coverage

- Medical school records created: ${input.medicalRows}
- States with healthcare wage context: ${input.workforceStats.states_with_bls_healthcare}
- States with nursing wage context: ${input.workforceStats.states_with_bls_nursing}
- States with HPSA aggregate context: ${input.workforceStats.states_with_hpsa}

## Ambiguous Examples

${input.ambiguousExamples.length ? input.ambiguousExamples.map((item) => `- ${item}`).join('\n') : '- None encountered in strict aggregate joins'}

## Sources Skipped Or Kept Indirect

${input.skipped.map((item) => `- ${item}`).join('\n')}

## Residency / Hospital-Only Exclusion

FREIDA, NRMP, ACGME, MedMap, ResidencyAdvisor, board pass rates, CMS hospital
quality, NPPES, Open Payments raw, residency-only, and hospital-only sources
were not read or exposed in D10. They belong to a future medical/residency
vertical and are intentionally excluded from the general ScholarshipTop static
context layer.

## Guardrails

- Outputs are aggregate/static JSON only.
- No raw NIH projects, HRSA rows, admissions tables, raw school dumps, residency
  records, or hospital quality records are shipped.
- No Supabase writes, migrations, Auth, Payments, canonical, robots, sitemap, or
  noindex policy changes are part of this build.
`;
  fs.writeFileSync(path.join(REPORT_DIR, 'd10-output-build-report.md'), report);
}

async function main(): Promise<void> {
  ensureDirs();

  const inputRows = resolveInputRows();
  writeCsv('d10-resolved-input-files.csv', inputRows);

  const medical = await buildMedicalSchoolEnrichment();
  const workforce = await buildHealthWorkforceContext();
  const topics = buildPremedTopicContext({
    medicalSchoolCount: medical.records.length,
    healthWorkforceRows: workforce.records
  });

  writeJson(
    'medical_school_enrichment.json',
    medical.records,
    'Small medical-school identity/accreditation context only; no residency, board pass, raw admissions, or hospital-quality data.'
  );
  writeJson(
    'health_workforce_context.json',
    workforce.records,
    'State-level aggregate health workforce planning context only; no raw HRSA rows or eligibility claims.'
  );
  writeJson(
    'premed_topic_context.json',
    topics,
    'Small curated topic index for pre-med, medical, nursing, and healthcare scholarship content; no raw data dump.'
  );

  writeBuildReport({
    medicalRows: medical.records.length,
    healthRows: workforce.records.length,
    topicRows: topics.length,
    medicalStats: medical.stats,
    workforceStats: workforce.stats,
    ambiguousExamples: medical.ambiguousExamples,
    skipped: [
      'NIH RePORTER raw normalized project file was not read directly; D10 reused D8 aggregate-only institution research context.',
      'OpenAlex and ROR raw/local normalized files were not read directly; D10 reused D8 aggregate-only institution research context.',
      'BLS metro was not used because D9 already created city/metro wage context and D10 is state-health-workforce scoped.',
      'Residency-only and hospital-only sources were excluded from general ScholarshipTop.'
    ]
  });

  console.log(
    JSON.stringify(
      {
        medical_school_enrichment: medical.records.length,
        health_workforce_context: workforce.records.length,
        premed_topic_context: topics.length,
        output_files: [
          'medical_school_enrichment.json',
          'health_workforce_context.json',
          'premed_topic_context.json'
        ]
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
