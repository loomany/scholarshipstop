import 'server-only';

import { loadInstitutionResearchEnrichmentRecords } from './loadStaticEnrichment';
import type { InstitutionResearchEnrichment } from './types';

type InstitutionResearchInput = {
  name?: string | null;
  state?: string | null;
  unitId?: string | null;
  rorId?: string | null;
  openAlexId?: string | null;
};

let byUnitIdCache: Map<string, InstitutionResearchEnrichment> | null = null;
let byRorIdCache: Map<string, InstitutionResearchEnrichment> | null = null;
let byOpenAlexIdCache: Map<string, InstitutionResearchEnrichment> | null = null;
let byNameStateCache: Map<string, InstitutionResearchEnrichment[]> | null = null;

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

function sourceKey(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const parts = raw.split('/');
  return (parts[parts.length - 1] ?? raw).trim() || null;
}

function nameStateKey(name: string, state: string): string {
  return `${normalizeName(name)}|${state.trim().toUpperCase()}`;
}

function ensureIndexes(): void {
  if (
    byUnitIdCache &&
    byRorIdCache &&
    byOpenAlexIdCache &&
    byNameStateCache
  ) {
    return;
  }

  byUnitIdCache = new Map();
  byRorIdCache = new Map();
  byOpenAlexIdCache = new Map();
  byNameStateCache = new Map();

  for (const row of loadInstitutionResearchEnrichmentRecords()) {
    const unitId = row.unit_id?.trim();
    if (unitId) byUnitIdCache.set(unitId, row);

    const rorId = sourceKey(row.ror_id);
    if (rorId) byRorIdCache.set(rorId, row);

    const openAlexId = sourceKey(row.openalex_id);
    if (openAlexId) byOpenAlexIdCache.set(openAlexId, row);

    const state = row.state?.trim().toUpperCase();
    if (row.name && state) {
      const key = nameStateKey(row.name, state);
      const matches = byNameStateCache.get(key) ?? [];
      matches.push(row);
      byNameStateCache.set(key, matches);
    }
  }
}

function hasDisplayableResearch(row: InstitutionResearchEnrichment | null): boolean {
  return Boolean(
    row &&
      (row.works_count != null ||
        row.cited_by_count != null ||
        row.nih_project_count != null ||
        row.ror_id ||
        row.openalex_id)
  );
}

export function getInstitutionResearchBySchool(
  input: InstitutionResearchInput
): InstitutionResearchEnrichment | null {
  ensureIndexes();

  const unitId = input.unitId?.trim();
  if (unitId) {
    const byUnit = byUnitIdCache!.get(unitId) ?? null;
    if (hasDisplayableResearch(byUnit)) return byUnit;
  }

  const rorId = sourceKey(input.rorId);
  if (rorId) {
    const byRor = byRorIdCache!.get(rorId) ?? null;
    if (hasDisplayableResearch(byRor)) return byRor;
  }

  const openAlexId = sourceKey(input.openAlexId);
  if (openAlexId) {
    const byOpenAlex = byOpenAlexIdCache!.get(openAlexId) ?? null;
    if (hasDisplayableResearch(byOpenAlex)) return byOpenAlex;
  }

  const name = input.name?.trim();
  const state = input.state?.trim().toUpperCase();
  if (!name || !state) return null;

  const matches = byNameStateCache!.get(nameStateKey(name, state));
  if (!matches?.length || matches.length > 1) return null;
  const row = matches[0] ?? null;
  return hasDisplayableResearch(row) ? row : null;
}
