export { buildEffectiveScholarshipFilters } from '@/lib/scholarships-v2/filters/effective';
export { normalizeScholarshipFilters } from '@/lib/scholarships-v2/filters/normalize';
export { getScholarshipList, getBestMatches } from '@/lib/scholarships-v2/pipeline/list';
export { getScholarshipCounts, getScholarshipMeta } from '@/lib/scholarships-v2/pipeline/counts';
export { buildScholarshipsRequestKey } from '@/lib/scholarships-v2/pipeline/requestKey';
export { createInMemoryScholarshipsV2Repository } from '@/lib/scholarships-v2/internalAdapter';
export { buildScholarshipsQuerySpec } from '@/lib/scholarships-v2/querySpec/buildQuerySpec';
export { buildSqlClausesFromQuerySpec } from '@/lib/scholarships-v2/sqlSpec/buildSqlClausesFromQuerySpec';
export { compareLegacyAndV2Clauses } from '@/lib/scholarships-v2/parity/compareClauses';
export { runShadowEvalHarness } from '@/lib/scholarships-v2/parity/shadowEvalHarness';
export { runShadowEvalHarnessWithArtifact } from '@/lib/scholarships-v2/parity/shadowEvalHarness';
export { buildParityArtifactV1, serializeParityArtifactV1, writeParityArtifactV1 } from '@/lib/scholarships-v2/parity/reportWriter';
export { DEFAULT_PARITY_THRESHOLDS, evaluateParityThresholds, assertParityThresholds, collectWorstFixtureIds } from '@/lib/scholarships-v2/parity/thresholds';
export { SHADOW_EVAL_FIXTURES } from '@/lib/scholarships-v2/parity/fixtures';
export { buildLegacyReferenceClausesFromCanonicalInput } from '@/lib/scholarships-v2/parity/legacyReferencePath';
export { adaptLegacyMoreFiltersToV2 } from '@/lib/scholarships-v2/adapters/fromLegacyMoreFilters';
export { adaptLegacySearchParamsToV2 } from '@/lib/scholarships-v2/adapters/fromLegacySearchParams';
export { buildV2FiltersFromLegacyInput } from '@/lib/scholarships-v2/adapters/buildV2FiltersFromLegacy';
export {
  normalizeDeadlinePreset,
  normalizeStateInputToCode,
  normalizeCitizenshipValue,
  normalizeGpaValue,
  parseCommaStateCodes,
  parseCommaUuids,
  parseCommaValues
} from '@/lib/scholarships-v2/normalization/legacy';
export type {
  DataCompletenessFlags,
  DeadlinePreset,
  EffectiveScholarshipFilters,
  PayoutFlags,
  ScholarshipCountsResult,
  ScholarshipFilterDraftState,
  ScholarshipFilterInput,
  ScholarshipListItem,
  ScholarshipMatchScoreBreakdown,
  ScholarshipMetaResult,
  ScholarshipProfileSignals,
  ScholarshipQueryRepository,
  ScholarshipRecord,
  ScholarshipSort,
  ScholarshipsV2Mode,
  UserCollectionTab
} from '@/lib/scholarships-v2/types';
export type {
  QuerySpecPredicate,
  QuerySpecStub,
  ScholarshipsQuerySpec
} from '@/lib/scholarships-v2/querySpec/types';
export type {
  CanonicalLegacyLikeInput,
  ClauseDiffCategory,
  ClauseDiffEntry,
  ClauseParityReport
} from '@/lib/scholarships-v2/parity/types';
export type { ParityArtifactV1 } from '@/lib/scholarships-v2/parity/reportWriter';
export type { ParityThresholds, ParityThresholdViolation } from '@/lib/scholarships-v2/parity/thresholds';
