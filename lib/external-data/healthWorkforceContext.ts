import 'server-only';

import { US_STATE_NAME_TO_CODE } from '@/lib/constants/usStates';

import { loadHealthWorkforceContextRecords } from './loadStaticEnrichment';
import type { HealthWorkforceContext } from './types';

let byCodeCache: Map<string, HealthWorkforceContext> | null = null;
let byNameCache: Map<string, HealthWorkforceContext> | null = null;

const STATE_NAME_TO_CODE_LOWER = Object.fromEntries(
  Object.entries(US_STATE_NAME_TO_CODE).map(([name, code]) => [
    name.toLowerCase(),
    code
  ])
);

function normalizeState(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper.length === 2) return upper;
  return US_STATE_NAME_TO_CODE[raw] ?? STATE_NAME_TO_CODE_LOWER[raw.toLowerCase()] ?? null;
}

function hasDisplayableContext(row: HealthWorkforceContext | null): boolean {
  return Boolean(
    row &&
      (row.healthcare_median_wage != null ||
        row.nursing_median_wage != null ||
        row.physician_assistant_median_wage != null ||
        row.medical_assistant_median_wage != null ||
        row.hpsa_count != null ||
        row.workforce_context)
  );
}

function ensureIndexes(): void {
  if (byCodeCache && byNameCache) return;
  byCodeCache = new Map();
  byNameCache = new Map();

  for (const row of loadHealthWorkforceContextRecords()) {
    const code = row.state_code?.trim().toUpperCase();
    if (code) byCodeCache.set(code, row);

    const name = row.state_name?.trim().toLowerCase();
    if (name) byNameCache.set(name, row);
  }
}

export function getHealthWorkforceContext(
  stateCodeOrName: string | null | undefined
): HealthWorkforceContext | null {
  const stateCode = normalizeState(stateCodeOrName);
  const raw = stateCodeOrName?.trim();
  if (!raw) return null;

  ensureIndexes();

  const row =
    stateCode ? byCodeCache!.get(stateCode) ?? null : byNameCache!.get(raw.toLowerCase()) ?? null;
  return hasDisplayableContext(row) ? row : null;
}
