import 'server-only';

import { US_STATE_CODE_TO_NAME, US_STATE_NAME_TO_CODE } from '@/lib/constants/usStates';

import { loadStateAffordabilityRecords } from './loadStaticEnrichment';
import type { StateAffordability } from './types';

let byStateCodeCache: Map<string, StateAffordability> | null = null;
let byStateNameCache: Map<string, StateAffordability> | null = null;

function ensureIndex(): void {
  if (byStateCodeCache && byStateNameCache) return;
  byStateCodeCache = new Map();
  byStateNameCache = new Map();
  for (const row of loadStateAffordabilityRecords()) {
    const code = row.state_code?.trim().toUpperCase();
    if (code) byStateCodeCache.set(code, row);
    const nameKey = row.state?.trim().toLowerCase();
    if (nameKey) byStateNameCache.set(nameKey, row);
  }
}

export function getStateAffordability(stateCode: string): StateAffordability | null {
  const code = stateCode.trim().toUpperCase();
  if (!code) return null;
  ensureIndex();
  return byStateCodeCache!.get(code) ?? null;
}

export function findStateAffordabilityByNameOrCode(
  input: string
): StateAffordability | null {
  const raw = input.trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (upper.length === 2) {
    return getStateAffordability(upper);
  }

  const codeFromName = US_STATE_NAME_TO_CODE[raw];
  if (codeFromName) {
    return getStateAffordability(codeFromName);
  }

  ensureIndex();
  return byStateNameCache!.get(raw.toLowerCase()) ?? null;
}

export type StateAffordabilityHighlight = {
  key: string;
  label: string;
  value: string;
};

export function getTopStateAffordabilityHighlights(
  row: StateAffordability | null
): StateAffordabilityHighlight[] {
  if (!row) return [];

  const highlights: StateAffordabilityHighlight[] = [];

  if (isPlausibleHouseholdIncome(row.median_household_income)) {
    highlights.push({
      key: 'income',
      label: 'Median household income',
      value: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(row.median_household_income)
    });
  }

  if (typeof row.hud_fmr_2br === 'number' && !Number.isNaN(row.hud_fmr_2br)) {
    highlights.push({
      key: 'fmr2',
      label: 'Fair market rent (2BR)',
      value: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(row.hud_fmr_2br)
    });
  }

  if (typeof row.living_wage_single_adult === 'number' && !Number.isNaN(row.living_wage_single_adult)) {
    highlights.push({
      key: 'living_wage',
      label: 'Living wage',
      value: `${row.living_wage_single_adult.toFixed(2)}/hr`
    });
  }

  if (typeof row.bls_median_wage === 'number' && !Number.isNaN(row.bls_median_wage)) {
    highlights.push({
      key: 'bls',
      label: 'BLS median wage',
      value: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(row.bls_median_wage)
    });
  }

  return highlights;
}

export type StateAffordabilityCoverageStats = {
  statesCovered: number;
  withRentData: number;
  withLivingWage: number;
  withBlsWage: number;
  withPublicSafetyContext: number;
};

export type StateComparePreviewRow = {
  state: string;
  state_code: string;
  hud_fmr_2br: number | null;
  bls_median_wage: number | null;
};

let stateCoverageCache: StateAffordabilityCoverageStats | null = null;

function scoreStateRow(row: StateAffordability): number {
  let score = 0;
  if (isPlausibleHouseholdIncome(row.median_household_income)) score += 1;
  if (row.hud_fmr_2br != null) score += 1;
  if (row.living_wage_single_adult != null) score += 1;
  if (row.bls_median_wage != null) score += 1;
  if (row.public_safety_context?.value != null) score += 1;
  return score;
}

export function getStateAffordabilityCoverageStats(): StateAffordabilityCoverageStats {
  if (stateCoverageCache) return stateCoverageCache;
  const records = loadStateAffordabilityRecords();
  stateCoverageCache = {
    statesCovered: records.length,
    withRentData: records.filter((r) => r.hud_fmr_2br != null).length,
    withLivingWage: records.filter((r) => r.living_wage_single_adult != null).length,
    withBlsWage: records.filter((r) => r.bls_median_wage != null).length,
    withPublicSafetyContext: records.filter((r) => r.public_safety_context != null)
      .length
  };
  return stateCoverageCache;
}

export function getStateComparePreview(limit = 3): StateComparePreviewRow[] {
  const cap = Math.max(1, Math.min(limit, 10));
  return loadStateAffordabilityRecords()
    .filter((row) => row.state_code?.trim())
    .sort((a, b) => scoreStateRow(b) - scoreStateRow(a))
    .slice(0, cap)
    .map((row) => ({
      state: row.state,
      state_code: row.state_code.trim().toUpperCase(),
      hud_fmr_2br: row.hud_fmr_2br ?? null,
      bls_median_wage: row.bls_median_wage ?? null
    }));
}

/** Skip clearly invalid census outliers when displaying income. */
export function isPlausibleHouseholdIncome(value: number | null | undefined): value is number {
  return typeof value === 'number' && !Number.isNaN(value) && value > 0 && value < 500_000;
}

export function stateDisplayName(stateCode: string): string {
  return US_STATE_CODE_TO_NAME[stateCode.trim().toUpperCase()] ?? stateCode;
}
