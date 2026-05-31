import fs from 'node:fs';
import path from 'node:path';

type ManifestFile = {
  name: string;
  rows: number;
  purpose?: string;
};

type Manifest = {
  generated_from?: string;
  files: ManifestFile[];
  supabase_writes?: boolean;
  contains_secrets?: boolean;
};

const DATA_DIR = path.join(
  process.cwd(),
  'data/external/scholarshiptop-enrichment'
);
const MANIFEST_PATH = path.join(DATA_DIR, 'MANIFEST.json');

const SECRET_PATTERNS = [
  /sk_live_[a-zA-Z0-9]+/,
  /sk_test_[a-zA-Z0-9]+/,
  /SUPABASE_SERVICE_ROLE/i,
  /BEGIN (RSA |OPENSSH )?PRIVATE KEY/,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/
];

const ADEK_PATH_PATTERN = /C:\\dev\\adek/i;

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function warn(message: string): void {
  console.warn(`WARN: ${message}`);
}

function ok(message: string): void {
  console.log(`OK: ${message}`);
}

function readJsonFile<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fail(`missing file ${filename}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch (err) {
    fail(`${filename} is not valid JSON: ${String(err)}`);
  }
}

function countDuplicates<T>(
  rows: T[],
  keyFn: (row: T) => string | null | undefined
): { duplicateKeys: number; examples: string[] } {
  const seen = new Map<string, number>();
  const examples: string[] = [];

  for (const row of rows) {
    const key = keyFn(row)?.trim();
    if (!key) continue;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 2 && examples.length < 5) examples.push(key);
  }

  const duplicateKeys = [...seen.values()].filter((n) => n > 1).length;
  return { duplicateKeys, examples };
}

function scanForForbiddenContent(raw: string, filename: string): void {
  if (ADEK_PATH_PATTERN.test(raw)) {
    fail(`${filename} contains forbidden C:\\dev\\adek path reference`);
  }

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(raw)) {
      fail(`${filename} matches secret-like pattern ${pattern}`);
    }
  }
}

function main(): void {
  if (!fs.existsSync(MANIFEST_PATH)) {
    fail('MANIFEST.json missing');
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
  if (!Array.isArray(manifest.files) || manifest.files.length !== 4) {
    fail('MANIFEST.files must list exactly 4 files');
  }

  let totalBytes = 0;
  const results: Record<string, { rows: number; duplicateKeys: number }> = {};

  for (const entry of manifest.files) {
    const filePath = path.join(DATA_DIR, entry.name);
    if (!fs.existsSync(filePath)) {
      fail(`manifest entry missing on disk: ${entry.name}`);
    }

    const stat = fs.statSync(filePath);
    totalBytes += stat.size;

    const raw = fs.readFileSync(filePath, 'utf8');
    scanForForbiddenContent(raw, entry.name);

    const parsed = readJsonFile<{ records?: unknown[] }>(entry.name);
    const rowCount = Array.isArray(parsed.records) ? parsed.records.length : 0;

    if (rowCount !== entry.rows) {
      fail(
        `${entry.name} row count ${rowCount} != manifest ${entry.rows}`
      );
    }

    results[entry.name] = { rows: rowCount, duplicateKeys: 0 };
    ok(`${entry.name}: ${rowCount} rows, ${(stat.size / 1024).toFixed(1)} KB`);
  }

  const schools = readJsonFile<{ records: Record<string, unknown>[] }>(
    'school_enrichment.json'
  ).records;
  const schoolUnitDupes = countDuplicates(schools, (r) =>
    typeof r.unit_id === 'string' ? r.unit_id : null
  );
  const schoolNameStateDupes = countDuplicates(schools, (r) => {
    const name = typeof r.school_name === 'string' ? r.school_name : '';
    const state = typeof r.state === 'string' ? r.state : '';
    return name && state ? `${name}|${state}` : null;
  });
  results['school_enrichment.json'].duplicateKeys =
    schoolUnitDupes.duplicateKeys + schoolNameStateDupes.duplicateKeys;
  if (schoolUnitDupes.duplicateKeys > 0) {
    fail(
      `school_enrichment unit_id duplicates: ${schoolUnitDupes.duplicateKeys} (${schoolUnitDupes.examples.join(', ')})`
    );
  }
  if (schoolNameStateDupes.duplicateKeys > 0) {
    warn(
      `school name+state duplicate keys: ${schoolNameStateDupes.duplicateKeys} (${schoolNameStateDupes.examples.join(', ')})`
    );
  }

  const states = readJsonFile<{ records: Record<string, unknown>[] }>(
    'state_affordability.json'
  ).records;
  const stateDupes = countDuplicates(states, (r) =>
    typeof r.state_code === 'string' ? r.state_code : null
  );
  results['state_affordability.json'].duplicateKeys = stateDupes.duplicateKeys;
  if (stateDupes.duplicateKeys > 0) {
    fail(`state_affordability state_code duplicates: ${stateDupes.duplicateKeys}`);
  }

  const cities = readJsonFile<{ records: Record<string, unknown>[] }>(
    'city_affordability.json'
  ).records;
  const cityDupes = countDuplicates(cities, (r) => {
    const city = typeof r.city === 'string' ? r.city : '';
    const state = typeof r.state === 'string' ? r.state : '';
    return city && state ? `${city}|${state}` : null;
  });
  results['city_affordability.json'].duplicateKeys = cityDupes.duplicateKeys;
  if (cityDupes.duplicateKeys > 0) {
    warn(
      `city_affordability city+state duplicate keys: ${cityDupes.duplicateKeys} (${cityDupes.examples.join(', ')}) — documented in Stage A`
    );
  }

  const locations = readJsonFile<{ records: Record<string, unknown>[] }>(
    'location_crosswalk.json'
  ).records;
  const locationDupes = countDuplicates(locations, (r) =>
    typeof r.location_key === 'string' ? r.location_key : null
  );
  results['location_crosswalk.json'].duplicateKeys = locationDupes.duplicateKeys;
  if (locationDupes.duplicateKeys > 0) {
    fail(
      `location_crosswalk location_key duplicates: ${locationDupes.duplicateKeys}`
    );
  }

  const maxBytes = 15 * 1024 * 1024;
  if (totalBytes >= maxBytes) {
    fail(`total size ${totalBytes} bytes >= 15 MB cap`);
  }

  ok(`total data size ${(totalBytes / 1024 / 1024).toFixed(2)} MB (< 15 MB)`);
  ok('no secrets-like strings detected');
  ok('no C:\\dev\\adek paths in final JSON');
  ok('manifest row counts match');

  if (manifest.supabase_writes !== false) {
    warn('manifest.supabase_writes is not explicitly false');
  }
  if (manifest.contains_secrets !== false) {
    warn('manifest.contains_secrets is not explicitly false');
  }

  console.log('\nValidation passed.');
}

main();
