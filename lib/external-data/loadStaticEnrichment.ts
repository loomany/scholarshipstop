import 'server-only';

import cityAffordabilityRaw from '@/data/external/scholarshiptop-enrichment/city_affordability.json';
import institutionResearchEnrichmentRaw from '@/data/external/scholarshiptop-enrichment/institution_research_enrichment.json';
import locationCrosswalkRaw from '@/data/external/scholarshiptop-enrichment/location_crosswalk.json';
import providerNonprofitEnrichmentRaw from '@/data/external/scholarshiptop-enrichment/provider_nonprofit_enrichment.json';
import schoolEnrichmentRaw from '@/data/external/scholarshiptop-enrichment/school_enrichment.json';
import stateAffordabilityRaw from '@/data/external/scholarshiptop-enrichment/state_affordability.json';
import stateSocialContextRaw from '@/data/external/scholarshiptop-enrichment/state_social_context.json';

import type {
  CityAffordability,
  EnrichmentFile,
  InstitutionResearchEnrichment,
  LocationCrosswalk,
  ProviderNonprofitEnrichment,
  SchoolEnrichment,
  StateAffordability,
  StateSocialContext
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

export function loadProviderNonprofitEnrichmentRecords(): ProviderNonprofitEnrichment[] {
  return safeRecords<ProviderNonprofitEnrichment>(
    providerNonprofitEnrichmentRaw,
    'provider_nonprofit_enrichment'
  );
}

export function loadInstitutionResearchEnrichmentRecords(): InstitutionResearchEnrichment[] {
  return safeRecords<InstitutionResearchEnrichment>(
    institutionResearchEnrichmentRaw,
    'institution_research_enrichment'
  );
}

export function loadStateAffordabilityRecords(): StateAffordability[] {
  return safeRecords<StateAffordability>(
    stateAffordabilityRaw,
    'state_affordability'
  );
}

export function loadStateSocialContextRecords(): StateSocialContext[] {
  return safeRecords<StateSocialContext>(
    stateSocialContextRaw,
    'state_social_context'
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
