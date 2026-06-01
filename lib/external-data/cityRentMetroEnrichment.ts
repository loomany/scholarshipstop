import 'server-only';

import { US_STATE_NAME_TO_CODE } from '@/lib/constants/usStates';

import { loadCityRentMetroEnrichmentRecords } from './loadStaticEnrichment';
import type { CityRentMetroEnrichment } from './types';

let byCityKeyCache: Map<string, CityRentMetroEnrichment> | null = null;
let byCityStateCache: Map<string, CityRentMetroEnrichment[]> | null = null;
const STATE_NAME_TO_CODE_LOWER = Object.fromEntries(
  Object.entries(US_STATE_NAME_TO_CODE).map(([name, code]) => [name.toLowerCase(), code])
);

function normalizeCity(value: string): string {
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

function normalizeState(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper.length === 2) return upper;
  return US_STATE_NAME_TO_CODE[raw] ?? STATE_NAME_TO_CODE_LOWER[raw.toLowerCase()] ?? null;
}

function cityStateKey(city: string, state: string): string {
  return `${normalizeCity(city)}|${state.trim().toUpperCase()}`;
}

function hasDisplayableContext(row: CityRentMetroEnrichment | null): boolean {
  return Boolean(
    row &&
      (row.hud_fmr_1br != null ||
        row.hud_fmr_2br != null ||
        row.zillow_latest_rent != null ||
        row.bls_median_wage != null ||
        row.bls_mean_wage != null)
  );
}

function ensureIndexes(): void {
  if (byCityKeyCache && byCityStateCache) return;

  byCityKeyCache = new Map();
  byCityStateCache = new Map();

  for (const row of loadCityRentMetroEnrichmentRecords()) {
    const cityKey = row.city_key?.trim().toLowerCase();
    if (cityKey) byCityKeyCache.set(cityKey, row);

    const state = row.state_code?.trim().toUpperCase();
    if (row.city && state) {
      const key = cityStateKey(row.city, state);
      const matches = byCityStateCache.get(key) ?? [];
      matches.push(row);
      byCityStateCache.set(key, matches);
    }
  }
}

export function getCityRentMetroByKey(
  cityKey: string | null | undefined
): CityRentMetroEnrichment | null {
  const key = cityKey?.trim().toLowerCase();
  if (!key) return null;
  ensureIndexes();
  const row = byCityKeyCache!.get(key) ?? null;
  return hasDisplayableContext(row) ? row : null;
}

/** Strict city + state lookup. Ambiguous city/state keys are hidden. */
export function getCityRentMetroByCityState(
  city: string | null | undefined,
  state: string | null | undefined
): CityRentMetroEnrichment | null {
  const stateCode = normalizeState(state);
  const cityName = city?.trim();
  if (!cityName || !stateCode) return null;

  ensureIndexes();
  const matches = byCityStateCache!.get(cityStateKey(cityName, stateCode));
  if (!matches?.length || matches.length > 1) return null;
  const row = matches[0] ?? null;
  return hasDisplayableContext(row) ? row : null;
}

export function getRentMetroContextForSchool(input: {
  city?: string | null;
  state?: string | null;
}): CityRentMetroEnrichment | null {
  return getCityRentMetroByCityState(input.city, input.state);
}

export function getRentMetroContextForProvider(input: {
  city?: string | null;
  state?: string | null;
}): CityRentMetroEnrichment | null {
  return getCityRentMetroByCityState(input.city, input.state);
}
