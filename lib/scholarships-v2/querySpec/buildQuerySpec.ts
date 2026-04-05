import type { EffectiveScholarshipFilters, ScholarshipsV2Mode } from '@/lib/scholarships-v2/types';
import { requirementTypesToDbColumns } from '@/lib/scholarships/requirementTypeMapping';
import type {
  QuerySpecPredicate,
  QuerySpecStub,
  ScholarshipsQuerySpec
} from '@/lib/scholarships-v2/querySpec/types';
import { resolveScholarshipsMode, resolveUserCollectionTab } from '@/lib/scholarships-v2/tabs/userCollections';

function deadlineBuckets(preset: EffectiveScholarshipFilters['deadlinePreset']): string[] {
  switch (preset) {
    case 'lt1d':
      return ['lt_1d'];
    case 'd1_7':
      return ['d1_7'];
    case 'w1_4':
      return ['d8_28'];
    case 'gt4w':
      return ['gt_28'];
    default:
      return [];
  }
}

function pushRangePredicate(
  out: QuerySpecPredicate[],
  field: string,
  min: number | null,
  max: number | null
): void {
  if (min == null && max == null) return;
  out.push({
    field,
    operator: 'range',
    value: { min, max }
  });
}

function applyIdListSemantics(
  mode: ScholarshipsV2Mode,
  filters: EffectiveScholarshipFilters,
  predicates: QuerySpecPredicate[]
): 'none' | 'saved' | 'ignored' | 'started' | 'submitted' {
  if (mode !== 'userCollections') {
    if (filters.ignoredIds.length > 0) {
      predicates.push({ field: 'id', operator: 'not', value: { in: filters.ignoredIds } });
    }
    return 'none';
  }

  const tab = resolveUserCollectionTab(filters);
  if (tab === 'saved') predicates.push({ field: 'id', operator: 'idSet', value: filters.savedIds });
  if (tab === 'ignored') predicates.push({ field: 'id', operator: 'idSet', value: filters.ignoredIds });
  if (tab === 'started') predicates.push({ field: 'id', operator: 'idSet', value: filters.startedIds });
  if (tab === 'submitted') predicates.push({ field: 'id', operator: 'idSet', value: filters.submittedIds });
  return tab;
}

function applyCategorySemantics(filters: EffectiveScholarshipFilters, predicates: QuerySpecPredicate[]): ScholarshipsQuerySpec['debug']['categoryScope'] {
  if (filters.catalogSubjectCategoryId) {
    predicates.push({
      field: 'scholarship_categories.category_id',
      operator: 'equals',
      value: filters.catalogSubjectCategoryId
    });
    return 'catalogSubjectCategoryId';
  }
  if (filters.categoryPageSlug) {
    predicates.push({ field: 'category_page', operator: 'equals', value: filters.categoryPageSlug });
    return 'categoryPageSlug';
  }
  if (filters.categoryIds.length > 0) {
    predicates.push({ field: 'category_ids', operator: 'containsAny', value: filters.categoryIds });
    return 'categoryIds';
  }
  return 'none';
}

export function buildScholarshipsQuerySpec(filters: EffectiveScholarshipFilters): ScholarshipsQuerySpec {
  const mode = resolveScholarshipsMode(filters);
  const predicates: QuerySpecPredicate[] = [];
  const stubs: QuerySpecStub[] = [];

  predicates.push({ field: 'is_active', operator: 'equals', value: true });

  if (filters.q) {
    predicates.push({ field: 'catalog_text', operator: 'or', value: filters.q });
  }

  if (filters.includeEligibility.length > 0) {
    predicates.push({
      field: 'eligibility_tags',
      operator: 'containsAny',
      value: filters.includeEligibility
    });
    if (filters.includeEligibility.includes('first_generation')) {
      predicates.push({
        field: 'first_generation',
        operator: 'textFallback',
        value: ['title', 'summary_short', 'description', 'requirements_text'],
        note: 'Legacy has text fallback clauses for selected eligibility tags.'
      });
    }
  }

  if (filters.includeGpaBuckets.length > 0) {
    predicates.push({ field: 'gpa_bucket', operator: 'in', value: filters.includeGpaBuckets });
  }

  if (filters.includeRequirementTypes.length > 0) {
    const requirementFields = requirementTypesToDbColumns(filters.includeRequirementTypes);
    if (requirementFields.length > 0) {
      predicates.push({
        field: 'requirement_flags',
        operator: 'or',
        value: requirementFields.map((field) => ({ field, equals: true }))
      });
    }
  }

  pushRangePredicate(predicates, 'applicants_count', filters.applicantsMin, filters.applicantsMax);

  if (filters.includeEasyApply.length > 0) {
    predicates.push({ field: 'easy_apply_flags', operator: 'containsAny', value: filters.includeEasyApply });
  }

  if (
    filters.dataCompleteness.low ||
    filters.dataCompleteness.medium ||
    filters.dataCompleteness.high ||
    filters.dataCompleteness.verified
  ) {
    predicates.push({
      field: 'listing_completeness',
      operator: 'or',
      value: {
        low: filters.dataCompleteness.low,
        medium: filters.dataCompleteness.medium,
        high: filters.dataCompleteness.high,
        verified: filters.dataCompleteness.verified
      }
    });
  }

  if (
    filters.payout.college ||
    filters.payout.student ||
    filters.payout.nonMonetary ||
    filters.payout.notStated
  ) {
    predicates.push({
      field: 'payout_method',
      operator: 'in',
      value: Object.entries(filters.payout)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
    });
  }

  if (filters.stateCodes.length > 0) {
    predicates.push({ field: 'state_codes', operator: 'containsAny', value: filters.stateCodes });
  }

  const buckets = deadlineBuckets(filters.deadlinePreset);
  if (buckets.length > 0) {
    predicates.push({ field: 'deadline_bucket', operator: 'in', value: buckets });
  }

  const categoryScope = applyCategorySemantics(filters, predicates);
  const idListSemantics = applyIdListSemantics(mode, filters, predicates);

  const tab =
    mode === 'bestMatches'
      ? 'bestMatches'
      : mode === 'userCollections'
        ? resolveUserCollectionTab(filters)
        : 'matches';

  return {
    mode,
    tab,
    predicates,
    stubs,
    debug: {
      deadlinePreset: filters.deadlinePreset,
      categoryScope,
      idListSemantics
    }
  };
}
