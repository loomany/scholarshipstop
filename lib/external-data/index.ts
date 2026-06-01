export type {
  CityAffordability,
  EnrichmentFile,
  EnrichmentFileMeta,
  InstitutionResearchEnrichment,
  LocationCrosswalk,
  ProviderNonprofitEnrichment,
  PublicSafetyContext,
  SchoolEnrichment,
  StateAffordability,
  StateSocialContext
} from './types';

export {
  getSchoolEnrichmentCoverageStats,
  getUniversityComparePreview,
  type SchoolEnrichmentCoverageStats,
  type SchoolEnrichmentPreviewRow
} from './enrichmentStats';

export {
  getStateAffordabilityCoverageStats,
  getStateComparePreview,
  findStateAffordabilityByNameOrCode,
  getStateAffordability,
  getTopStateAffordabilityHighlights,
  isPlausibleHouseholdIncome,
  stateDisplayName,
  type StateAffordabilityCoverageStats,
  type StateAffordabilityHighlight,
  type StateComparePreviewRow
} from './stateAffordability';

export {
  loadCityAffordabilityRecords,
  loadInstitutionResearchEnrichmentRecords,
  loadLocationCrosswalkRecords,
  loadProviderNonprofitEnrichmentRecords,
  loadSchoolEnrichmentRecords,
  loadStateAffordabilityRecords,
  loadStateSocialContextRecords
} from './loadStaticEnrichment';

export {
  findSchoolByNameState,
  findSchoolBySlugOrName,
  findSchoolsByName,
  getSchoolByNameAndState,
  getSchoolByUnitId,
  getSchoolsByState,
  matchProviderToSchool,
  matchSchoolForInstitution
} from './schoolEnrichment';

export {
  getProviderNonprofitByEin,
  getProviderNonprofitByNameState,
  matchProviderToNonprofit
} from './providerNonprofitEnrichment';

export { getInstitutionResearchBySchool } from './institutionResearchEnrichment';

export { getStateSocialContext } from './stateSocialContext';

export {
  findCityAffordabilityByCityState,
  getCityAffordability
} from './cityAffordability';

export {
  getLocationByCityState,
  getLocationByKey
} from './locationCrosswalk';

export {
  hasDisplayableContentContext,
  isGenericTopicSlug,
  resolveContentEnrichmentContext,
  resolveStateCodeFromContentHints,
  type ContentEnrichmentHints,
  type ResolvedContentEnrichmentContext
} from './resolveContentEnrichmentContext';

export {
  buildRelatedScholarshipContextLinks,
  resolveContentEnrichmentLinkCluster,
  type ContextLinkItem,
  type ScholarshipContextLinkCluster
} from './contentEnrichmentLinks';

export {
  buildInternalLinkCluster,
  finalizeInternalLinks,
  internalLinkTitle,
  normalizeInternalLinkHref,
  resolveStateSlugFromCode,
  type InternalLinkGraphInput,
  type InternalLinkPageType
} from './internalLinkGraph';

export {
  schoolCompareBarMetrics,
  schoolProfilePairMetrics,
  schoolSingleBarMetrics,
  stateCompareBarMetrics,
  statePlanningPairMetrics,
  type VizBarMetric,
  type VizPairMetric
} from './enrichmentVizMetrics';

export {
  hasScholarshipUniversitySidebarContent,
  resolveAffordabilitySidebarStateSlug,
  resolveScholarshipStateContext,
  resolveScholarshipUniversityContext,
  type ScholarshipStateContext,
  type ScholarshipUniversityContext
} from './scholarshipPageEnrichment';
