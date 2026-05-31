import 'server-only';

import { loadCityAffordabilityRecords } from './loadStaticEnrichment';
import type { CityAffordability } from './types';

let byCityStateCache: Map<string, CityAffordability> | null = null;

function normalizeCity(city: string): string {
  return city.trim().toLowerCase();
}

function cityStateKey(city: string, stateCode: string): string {
  return `${normalizeCity(city)}|${stateCode.trim().toUpperCase()}`;
}

function ensureIndex(): void {
  if (byCityStateCache) return;
  byCityStateCache = new Map();
  for (const row of loadCityAffordabilityRecords()) {
    byCityStateCache.set(cityStateKey(row.city, row.state), row);
    if (row.city_ascii) {
      byCityStateCache.set(cityStateKey(row.city_ascii, row.state), row);
    }
  }
}

export function getCityAffordability(
  city: string,
  stateCode: string
): CityAffordability | null {
  const key = cityStateKey(city, stateCode);
  if (!normalizeCity(city)) return null;
  ensureIndex();
  return byCityStateCache!.get(key) ?? null;
}
