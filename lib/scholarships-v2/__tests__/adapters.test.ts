import test from 'node:test';
import assert from 'node:assert/strict';

import { adaptLegacyMoreFiltersToV2 } from '@/lib/scholarships-v2/adapters/fromLegacyMoreFilters';
import { adaptLegacySearchParamsToV2 } from '@/lib/scholarships-v2/adapters/fromLegacySearchParams';
import { buildV2FiltersFromLegacyInput } from '@/lib/scholarships-v2/adapters/buildV2FiltersFromLegacy';

test('adaptLegacySearchParamsToV2 maps tab/category/deadline/id lists', () => {
  const sp = new URLSearchParams(
    'tab=saved&q=biology&category=stem,arts&deadline=1_4_weeks&state=fl,ga&page=2&sort=highest_amount&saved=11111111-1111-1111-1111-111111111111'
  );

  const out = adaptLegacySearchParamsToV2(sp);

  assert.equal(out.mode, 'userCollections');
  assert.equal(out.filters.userCollectionTab, 'saved');
  assert.deepEqual(out.filters.stateCodes, ['FL', 'GA']);
  assert.equal(out.filters.deadlinePreset, '1_4_weeks');
  assert.equal(out.page, 2);
  assert.equal(out.sort, 'amountHighToLow');
  assert.deepEqual(out.filters.savedIds, ['11111111-1111-1111-1111-111111111111']);
});

test('adaptLegacyMoreFiltersToV2 maps top-priority facet keys', () => {
  const out = adaptLegacyMoreFiltersToV2({
    deadlinePreset: 'd1_7',
    amountMin: 100,
    amountMax: 5000,
    applicantsMin: 1,
    applicantsMax: 1000,
    includeRequirementTypes: ['essay'],
    dataCompleteness: { low: true, medium: false, high: false, verified: true },
    payout: { college: true, student: false, nonMonetary: false, notStated: false },
    includeEligibility: ['first_generation'],
    includeEducationLevels: ['undergraduate'],
    includeGpaBuckets: ['gpa_3'],
    includeLocationLabels: [],
    includeEasyApply: ['no_essay'],
    filterStateInput: 'Florida'
  });

  assert.deepEqual(out.includeRequirementTypes, ['essay']);
  assert.deepEqual(out.includeEligibility, ['first_generation']);
  assert.deepEqual(out.includeGpaBuckets, ['gpa_3']);
  assert.deepEqual(out.includeEasyApply, ['no_essay']);
  assert.equal(out.stateQuery, 'Florida');
  assert.equal(out.applicantsMax, 1000);
  assert.equal(out.deadlinePreset, 'd1_7');
});

test('buildV2FiltersFromLegacyInput composes search params + more filters', () => {
  const sp = new URLSearchParams('tab=best-matches&deadline=lt_1d');
  const effective = buildV2FiltersFromLegacyInput({
    searchParams: sp,
    moreFilters: {
      deadlinePreset: 'w1_4',
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
  });

  assert.equal(effective.mode, 'bestMatches');
  assert.equal(effective.deadlinePreset, 'lt1d');
  assert.equal(effective.sort, 'relevance');
});
