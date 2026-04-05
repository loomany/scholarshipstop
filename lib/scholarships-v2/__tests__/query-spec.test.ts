import test from 'node:test';
import assert from 'node:assert/strict';

import { buildV2FiltersFromLegacyInput } from '@/lib/scholarships-v2/adapters/buildV2FiltersFromLegacy';
import { buildScholarshipsQuerySpec } from '@/lib/scholarships-v2/querySpec/buildQuerySpec';

test('legacy-like input -> v2 filters -> query spec includes top-priority facets', () => {
  const filters = buildV2FiltersFromLegacyInput({
    searchParams: new URLSearchParams(
      'tab=saved&category=stem&category_page=engineering&deadline=1_4_weeks&state=fl&saved=11111111-1111-1111-1111-111111111111&ignored=22222222-2222-2222-2222-222222222222'
    ),
    moreFilters: {
      deadlinePreset: 'd1_7',
      amountMin: 500,
      amountMax: 5000,
      applicantsMin: 0,
      applicantsMax: 1000,
      includeRequirementTypes: ['essay', 'resume'],
      dataCompleteness: { low: true, medium: false, high: false, verified: true },
      payout: { college: true, student: false, nonMonetary: false, notStated: false },
      includeEligibility: ['first_generation'],
      includeEducationLevels: ['undergraduate'],
      includeGpaBuckets: ['gpa_3'],
      includeLocationLabels: [],
      includeEasyApply: ['no_essay'],
      filterStateInput: 'Florida'
    }
  });

  const spec = buildScholarshipsQuerySpec(filters);

  assert.equal(spec.mode, 'userCollections');
  assert.equal(spec.tab, 'saved');
  assert.equal(spec.debug.categoryScope, 'categoryPageSlug');

  const fields = spec.predicates.map((p) => p.field);
  assert.ok(fields.includes('eligibility_tags'));
  assert.ok(fields.includes('catalog_education_levels'));
  assert.ok(fields.includes('gpa_bucket'));
  assert.ok(fields.includes('easy_apply_flags'));
  assert.ok(fields.includes('applicants_count'));
  assert.ok(fields.includes('deadline_bucket'));

  assert.equal(spec.stubs.length, 0);
});

test('mode/category/id-list behavior in query spec', () => {
  const filters = buildV2FiltersFromLegacyInput({
    searchParams: new URLSearchParams(
      'tab=best-matches&category=stem,arts&ignored=22222222-2222-2222-2222-222222222222'
    ),
    moreFilters: null
  });

  const spec = buildScholarshipsQuerySpec(filters);

  assert.equal(spec.mode, 'bestMatches');
  assert.equal(spec.tab, 'bestMatches');
  assert.equal(spec.debug.categoryScope, 'categoryIds');
  assert.equal(spec.debug.idListSemantics, 'none');
  assert.ok(
    spec.predicates.some(
      (p) => p.field === 'id' && p.operator === 'not'
    )
  );
});

test('facet parity snapshot shape stays stable', () => {
  const filters = buildV2FiltersFromLegacyInput({
    searchParams: new URLSearchParams('tab=matches&deadline=gt_4w&state=ca,ny'),
    moreFilters: {
      deadlinePreset: 'gt4w',
      amountMin: 100,
      amountMax: 2000,
      applicantsMin: 10,
      applicantsMax: 50,
      includeRequirementTypes: ['document'],
      dataCompleteness: { low: false, medium: true, high: false, verified: false },
      payout: { college: false, student: true, nonMonetary: false, notStated: false },
      includeEligibility: ['veterans'],
      includeEducationLevels: ['undergraduate'],
      includeGpaBuckets: ['gpa_25'],
      includeLocationLabels: [],
      includeEasyApply: ['easy_apply'],
      filterStateInput: ''
    }
  });

  const spec = buildScholarshipsQuerySpec(filters);

  const snapshot = {
    mode: spec.mode,
    tab: spec.tab,
    debug: spec.debug,
    predicates: spec.predicates.map((p) => ({ field: p.field, operator: p.operator }))
  };

  assert.deepEqual(snapshot, {
    mode: 'catalog',
    tab: 'matches',
    debug: {
      deadlinePreset: 'gt4w',
      categoryScope: 'none',
      idListSemantics: 'none'
    },
    predicates: [
      { field: 'is_active', operator: 'equals' },
      { field: 'eligibility_tags', operator: 'containsAny' },
      { field: 'catalog_education_levels', operator: 'containsAny' },
      { field: 'gpa_bucket', operator: 'in' },
      { field: 'requirement_flags', operator: 'or' },
      { field: 'applicants_count', operator: 'range' },
      { field: 'easy_apply_flags', operator: 'containsAny' },
      { field: 'listing_completeness', operator: 'or' },
      { field: 'payout_method', operator: 'in' },
      { field: 'state_codes', operator: 'containsAny' },
      { field: 'deadline_bucket', operator: 'in' }
    ]
  });
});

test('requirement filters use OR include semantics and skip resume-only selections', () => {
  const filters = buildV2FiltersFromLegacyInput({
    searchParams: new URLSearchParams('tab=matches'),
    moreFilters: {
      deadlinePreset: 'any',
      amountMin: 0,
      amountMax: 1000,
      applicantsMin: 0,
      applicantsMax: 100,
      includeRequirementTypes: ['essay', 'question', 'resume'],
      dataCompleteness: { low: false, medium: false, high: false, verified: false },
      payout: { college: false, student: false, nonMonetary: false, notStated: false },
      includeEligibility: [],
      includeEducationLevels: [],
      includeGpaBuckets: [],
      includeLocationLabels: [],
      includeEasyApply: [],
      filterStateInput: ''
    }
  });
  const spec = buildScholarshipsQuerySpec(filters);
  const requirementPredicate = spec.predicates.find((p) => p.field === 'requirement_flags');
  assert.deepEqual(requirementPredicate, {
    field: 'requirement_flags',
    operator: 'or',
    value: [
      { field: 'essay_required', equals: true },
      { field: 'question_required', equals: true }
    ]
  });

  const resumeOnly = buildScholarshipsQuerySpec(
    buildV2FiltersFromLegacyInput({
      searchParams: new URLSearchParams('tab=matches'),
      moreFilters: {
        deadlinePreset: 'any',
        amountMin: 0,
        amountMax: 1000,
        applicantsMin: 0,
        applicantsMax: 100,
        includeRequirementTypes: ['resume'],
        dataCompleteness: { low: false, medium: false, high: false, verified: false },
        payout: { college: false, student: false, nonMonetary: false, notStated: false },
        includeEligibility: [],
        includeEducationLevels: [],
        includeGpaBuckets: [],
        includeLocationLabels: [],
        includeEasyApply: [],
        filterStateInput: ''
      }
    })
  );
  assert.equal(resumeOnly.predicates.some((p) => p.field === 'requirement_flags'), false);

  const emptySelection = buildScholarshipsQuerySpec(
    buildV2FiltersFromLegacyInput({
      searchParams: new URLSearchParams('tab=matches'),
      moreFilters: {
        deadlinePreset: 'any',
        amountMin: 0,
        amountMax: 1000,
        applicantsMin: 0,
        applicantsMax: 100,
        includeRequirementTypes: [],
        dataCompleteness: { low: false, medium: false, high: false, verified: false },
        payout: { college: false, student: false, nonMonetary: false, notStated: false },
        includeEligibility: [],
        includeEducationLevels: [],
        includeGpaBuckets: [],
        includeLocationLabels: [],
        includeEasyApply: [],
        filterStateInput: ''
      }
    })
  );
  assert.equal(emptySelection.predicates.some((p) => p.field === 'requirement_flags'), false);
});
