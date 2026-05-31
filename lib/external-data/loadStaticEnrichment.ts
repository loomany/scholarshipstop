import 'server-only';

import cityAffordabilityRaw from '@/data/external/scholarshiptop-enrichment/city_affordability.json';
import locationCrosswalkRaw from '@/data/external/scholarshiptop-enrichment/location_crosswalk.json';
import schoolEnrichmentRaw from '@/data/external/scholarshiptop-enrichment/school_enrichment.json';
import stateAffordabilityRaw from '@/data/external/scholarshiptop-enrichment/state_affordability.json';

import type {
  CityAffordability,
  EnrichmentFile,
  LocationCrosswalk,
  SchoolEnrichment,
  StateAffordability
} from './types';

const isDevOrTest =
  process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

function safeRecords<T>(raw: unknown, label: string): T[] {
  if (!raw || typeof raw !== 'object') {
    if (isDevOrTest) {
      console.warn(`[external-data] ${label}: invalid envelope, using []`);
    }
    return [];
  }
  const records = (raw as EnrichmentFile<T>).records;
  if (!Array.isArray(records)) {
    if (isDevOrTest) {
      console.warn(`[external-data] ${label}: missing records array, using []`);
    }
    return [];
  }
  return records;
}

export function loadSchoolEnrichmentRecords(): SchoolEnrichment[] {
  return safeRecords<SchoolEnrichment>(schoolEnrichmentRaw, 'school_enrichment');
}

export function loadStateAffordabilityRecords(): StateAffordability[] {
  return safeRecords<StateAffordability>(
    stateAffordabilityRaw,
    'state_affordability'
  );
}

export function loadCityAffordabilityRecords(): CityAffordability[] {
  return safeRecords<CityAffordability>(
    cityAffordabilityRaw,
    'city_affordability'
  );
}

export function loadLocationCrosswalkRecords(): LocationCrosswalk[] {
  return safeRecords<LocationCrosswalk>(
    locationCrosswalkRaw,
    'location_crosswalk'
  );
}
