import 'server-only';

import { loadStateAffordabilityRecords } from './loadStaticEnrichment';
import type { StateAffordability } from './types';

let byStateCodeCache: Map<string, StateAffordability> | null = null;

function ensureIndex(): void {
  if (byStateCodeCache) return;
  byStateCodeCache = new Map();
  for (const row of loadStateAffordabilityRecords()) {
    const code = row.state_code?.trim().toUpperCase();
    if (code) byStateCodeCache.set(code, row);
  }
}

export function getStateAffordability(stateCode: string): StateAffordability | null {
  const code = stateCode.trim().toUpperCase();
  if (!code) return null;
  ensureIndex();
  return byStateCodeCache!.get(code) ?? null;
}

/** Skip clearly invalid census outliers when displaying income. */
export function isPlausibleHouseholdIncome(value: number | null | undefined): value is number {
  return typeof value === 'number' && !Number.isNaN(value) && value > 0 && value < 500_000;
}
