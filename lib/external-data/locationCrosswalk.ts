import 'server-only';

import { loadLocationCrosswalkRecords } from './loadStaticEnrichment';
import type { LocationCrosswalk } from './types';

let byLocationKeyCache: Map<string, LocationCrosswalk> | null = null;
let byCityStateCache: Map<string, LocationCrosswalk> | null = null;

function normalizeCity(city: string): string {
  return city.trim().toLowerCase();
}

function cityStateKey(city: string, stateCode: string): string {
  return `${normalizeCity(city)}|${stateCode.trim().toUpperCase()}`;
}

function ensureIndexes(): void {
  if (byLocationKeyCache && byCityStateCache) return;

  byLocationKeyCache = new Map();
  byCityStateCache = new Map();

  for (const row of loadLocationCrosswalkRecords()) {
    const locationKey = row.location_key?.trim().toLowerCase();
    if (locationKey) byLocationKeyCache.set(locationKey, row);

    const state = (row.state_code ?? row.state)?.trim().toUpperCase();
    if (state) {
      byCityStateCache.set(cityStateKey(row.city, state), row);
    }
  }
}

export function getLocationByKey(locationKey: string): LocationCrosswalk | null {
  const key = locationKey.trim().toLowerCase();
  if (!key) return null;
  ensureIndexes();
  return byLocationKeyCache!.get(key) ?? null;
}

export function getLocationByCityState(
  city: string,
  stateCode: string
): LocationCrosswalk | null {
  if (!normalizeCity(city)) return null;
  ensureIndexes();
  return byCityStateCache!.get(cityStateKey(city, stateCode)) ?? null;
}
