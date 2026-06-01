import 'server-only';

import { US_STATE_NAME_TO_CODE } from '@/lib/constants/usStates';

import { loadMedicalSchoolEnrichmentRecords } from './loadStaticEnrichment';
import type { MedicalSchoolEnrichment } from './types';

let bySchoolKeyCache: Map<string, MedicalSchoolEnrichment> | null = null;
let byUnitIdCache: Map<string, MedicalSchoolEnrichment> | null = null;
let byNameStateCache: Map<string, MedicalSchoolEnrichment[]> | null = null;

const STATE_NAME_TO_CODE_LOWER = Object.fromEntries(
  Object.entries(US_STATE_NAME_TO_CODE).map(([name, code]) => [
    name.toLowerCase(),
    code
  ])
);

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\b(the)\b/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeState(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper.length === 2) return upper;
  return US_STATE_NAME_TO_CODE[raw] ?? STATE_NAME_TO_CODE_LOWER[raw.toLowerCase()] ?? null;
}

function nameStateKey(name: string, state: string): string {
  return `${normalizeName(name)}|${state.trim().toUpperCase()}`;
}

function hasDisplayableMedicalSchool(row: MedicalSchoolEnrichment | null): boolean {
  return Boolean(
    row &&
      (row.school_type ||
        row.accreditor ||
        row.accreditation_status ||
        row.website ||
        row.admit_stats_available ||
        row.nih_project_count != null ||
        row.openalex_works_count != null)
  );
}

function ensureIndexes(): void {
  if (bySchoolKeyCache && byUnitIdCache && byNameStateCache) return;

  bySchoolKeyCache = new Map();
  byUnitIdCache = new Map();
  byNameStateCache = new Map();

  for (const row of loadMedicalSchoolEnrichmentRecords()) {
    const schoolKey = row.school_key?.trim().toLowerCase();
    if (schoolKey) bySchoolKeyCache.set(schoolKey, row);

    const unitId = row.scorecard_unit_id?.trim();
    if (unitId) byUnitIdCache.set(unitId, row);

    const state = normalizeState(row.state);
    if (row.name && state) {
      const key = nameStateKey(row.name, state);
      const matches = byNameStateCache.get(key) ?? [];
      matches.push(row);
      byNameStateCache.set(key, matches);
    }
  }
}

export function getMedicalSchoolByNameState(
  name: string | null | undefined,
  state?: string | null
): MedicalSchoolEnrichment | null {
  const schoolName = name?.trim();
  const stateCode = normalizeState(state);
  if (!schoolName || !stateCode) return null;

  ensureIndexes();
  const matches = byNameStateCache!.get(nameStateKey(schoolName, stateCode));
  if (!matches?.length || matches.length > 1) return null;
  const row = matches[0] ?? null;
  return hasDisplayableMedicalSchool(row) ? row : null;
}

export function getMedicalSchoolByUnitId(
  unitId: string | null | undefined
): MedicalSchoolEnrichment | null {
  const key = unitId?.trim();
  if (!key) return null;

  ensureIndexes();
  const row = byUnitIdCache!.get(key) ?? null;
  return hasDisplayableMedicalSchool(row) ? row : null;
}

export function getMedicalSchoolByKey(
  schoolKey: string | null | undefined
): MedicalSchoolEnrichment | null {
  const key = schoolKey?.trim().toLowerCase();
  if (!key) return null;

  ensureIndexes();
  const row = bySchoolKeyCache!.get(key) ?? null;
  return hasDisplayableMedicalSchool(row) ? row : null;
}
