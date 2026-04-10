import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultMoreFiltersFromBounds } from '@/app/scholarships/moreFilters';
import {
  mergeBestRecommendationFiltersFromProfile,
  type ScholarshipProfileFilterSeed
} from '@/lib/scholarships/profileFilterDefaults';

const bounds = {
  amountMin: 0,
  amountMax: 50000,
  applicantsMin: 0,
  applicantsMax: 200000
};

test('mergeBestRecommendationFiltersFromProfile leaves matches tab unchanged', () => {
  const base = defaultMoreFiltersFromBounds(bounds);
  base.filterStateInput = '';
  const seed: ScholarshipProfileFilterSeed = {
    fieldOfStudy: null,
    schoolLevel: 'college_freshman',
    citizenship: null,
    stateInput: 'Florida',
    educationLevelIds: ['undergraduate'],
    gpaBucketIds: [],
    eligibilityIds: []
  };
  const out = mergeBestRecommendationFiltersFromProfile(
    'matches',
    base,
    seed,
    bounds
  );
  assert.equal(out.filterStateInput, '');
  assert.equal(out.includeEducationLevels.size, 0);
});

test('mergeBestRecommendationFiltersFromProfile fills empty facets from profile on best-matches', () => {
  const base = defaultMoreFiltersFromBounds(bounds);
  const seed: ScholarshipProfileFilterSeed = {
    fieldOfStudy: null,
    schoolLevel: 'college_freshman',
    citizenship: null,
    stateInput: 'Florida',
    educationLevelIds: ['undergraduate'],
    gpaBucketIds: ['gpa_3_0_plus'],
    eligibilityIds: []
  };
  const out = mergeBestRecommendationFiltersFromProfile(
    'best-matches',
    base,
    seed,
    bounds
  );
  assert.equal(out.filterStateInput, 'Florida');
  assert.deepEqual(Array.from(out.includeEducationLevels).sort(), ['undergraduate']);
  assert.deepEqual(Array.from(out.includeGpaBuckets).sort(), ['gpa_3_0_plus']);
});

test('mergeBestRecommendationFiltersFromProfile does not override user-picked education levels', () => {
  const base = defaultMoreFiltersFromBounds(bounds);
  base.includeEducationLevels.add('graduate');
  const seed: ScholarshipProfileFilterSeed = {
    fieldOfStudy: null,
    schoolLevel: 'college_freshman',
    citizenship: null,
    stateInput: '',
    educationLevelIds: ['undergraduate'],
    gpaBucketIds: [],
    eligibilityIds: []
  };
  const out = mergeBestRecommendationFiltersFromProfile(
    'best-matches',
    base,
    seed,
    bounds
  );
  assert.deepEqual(Array.from(out.includeEducationLevels).sort(), ['graduate']);
});

test('mergeBestRecommendationFiltersFromProfile returns clone when seed is null', () => {
  const base = defaultMoreFiltersFromBounds(bounds);
  base.filterStateInput = 'Texas';
  const out = mergeBestRecommendationFiltersFromProfile(
    'best-matches',
    base,
    null,
    bounds
  );
  assert.equal(out.filterStateInput, 'Texas');
  out.filterStateInput = 'Changed';
  assert.equal(base.filterStateInput, 'Texas');
});
