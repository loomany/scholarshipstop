import 'server-only';

import { loadSchoolEnrichmentRecords } from './loadStaticEnrichment';
import type { SchoolEnrichment } from './types';

let recordsCache: SchoolEnrichment[] | null = null;
let byUnitIdCache: Map<string, SchoolEnrichment> | null = null;
let byNameStateCache: Map<string, SchoolEnrichment[]> | null = null;
let byStateCache: Map<string, SchoolEnrichment[]> | null = null;

function normalizeKeyPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameStateKey(name: string, stateCode: string): string {
  return `${normalizeKeyPart(name)}|${stateCode.trim().toUpperCase()}`;
}

function ensureIndexes(): void {
  if (recordsCache && byUnitIdCache && byNameStateCache && byStateCache) return;

  recordsCache = loadSchoolEnrichmentRecords();
  byUnitIdCache = new Map();
  byNameStateCache = new Map();
  byStateCache = new Map();

  for (const row of recordsCache) {
    const unitId = row.unit_id?.trim();
    if (unitId) {
      byUnitIdCache.set(unitId, row);
    }

    const stateCode = row.state?.trim().toUpperCase();
    if (stateCode) {
      const stateRows = byStateCache.get(stateCode) ?? [];
      stateRows.push(row);
      byStateCache.set(stateCode, stateRows);

      const nsKey = nameStateKey(row.school_name, stateCode);
      const nameRows = byNameStateCache.get(nsKey) ?? [];
      nameRows.push(row);
      byNameStateCache.set(nsKey, nameRows);
    }
  }
}

export function getSchoolByUnitId(unitId: string): SchoolEnrichment | null {
  const id = unitId.trim();
  if (!id) return null;
  ensureIndexes();
  return byUnitIdCache!.get(id) ?? null;
}

export function getSchoolsByState(stateCode: string): SchoolEnrichment[] {
  const code = stateCode.trim().toUpperCase();
  if (!code) return [];
  ensureIndexes();
  return byStateCache!.get(code) ?? [];
}

/** Exact normalized name + state lookup (preferred for institution joins). */
export function getSchoolByNameAndState(
  name: string,
  stateCode: string
): SchoolEnrichment | null {
  const key = nameStateKey(name, stateCode);
  ensureIndexes();
  const matches = byNameStateCache!.get(key);
  if (!matches?.length) return null;
  return matches[0] ?? null;
}

/**
 * Lightweight prefix/exact search — capped results, server-side only.
 * Query should already be normalized-ish; not for fuzzy client search.
 */
export function findSchoolsByName(query: string, limit = 20): SchoolEnrichment[] {
  const q = normalizeKeyPart(query);
  if (!q) return [];
  ensureIndexes();

  const exact: SchoolEnrichment[] = [];
  const prefix: SchoolEnrichment[] = [];

  for (const row of recordsCache!) {
    const name = normalizeKeyPart(row.school_name);
    if (name === q) {
      exact.push(row);
      if (exact.length >= limit) return exact;
      continue;
    }
    if (name.startsWith(q) && prefix.length < limit) {
      prefix.push(row);
    }
  }

  return exact.length ? exact : prefix.slice(0, limit);
}

export function matchSchoolForInstitution(input: {
  name: string;
  state?: string | null;
}): SchoolEnrichment | null {
  const stateCode = input.state?.trim().toUpperCase();
  if (stateCode) {
    const exact = getSchoolByNameAndState(input.name, stateCode);
    if (exact) return exact;
  }

  const q = normalizeKeyPart(input.name);
  if (!q) return null;

  const candidates = findSchoolsByName(input.name, 5);
  if (!candidates.length) return null;

  if (stateCode) {
    const inState = candidates.filter(
      (c) => c.state?.trim().toUpperCase() === stateCode
    );
    if (inState.length === 1) return inState[0] ?? null;
  }

  if (candidates.length === 1) return candidates[0] ?? null;
  return null;
}
