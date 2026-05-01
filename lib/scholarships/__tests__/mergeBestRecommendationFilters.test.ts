import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultMoreFiltersFromBounds } from '@/app/scholarships/moreFilters';
import { DOMESTIC_OR_UNSPECIFIED_CITIZENSHIP } from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  buildMoreFiltersWithProfileDefaults,
  mergeBestRecommendationFiltersFromProfile,
  stripHubProfileHardMatchMoreFilters,
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

test('mergeBestRecommendationFiltersFromProfile fills empty facets from profile on best-recommendation', () => {
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
    'best-recommendation',
    base,
    seed,
    bounds
  );
  assert.equal(out.filterStateInput, 'Florida');
  assert.deepEqual(Array.from(out.includeEducationLevels).sort(), ['undergraduate']);
  assert.deepEqual(Array.from(out.includeGpaBuckets).sort(), ['gpa_3_0_plus']);
});

test('mergeBestRecommendationFiltersFromProfile keeps international_student as a ranking signal on best-recommendation', () => {
  const base = defaultMoreFiltersFromBounds(bounds);
  const seed: ScholarshipProfileFilterSeed = {
    fieldOfStudy: null,
    schoolLevel: null,
    citizenship: 'international_student',
    stateInput: '',
    educationLevelIds: [],
    gpaBucketIds: [],
    eligibilityIds: []
  };
  const out = mergeBestRecommendationFiltersFromProfile(
    'best-recommendation',
    base,
    seed,
    bounds
  );
  assert.equal(out.citizenshipAudience, 'any');
  assert.equal(out.includeEligibility.size, 0);
});

test('mergeBestRecommendationFiltersFromProfile still allows international_friendly on recommended', () => {
  const base = defaultMoreFiltersFromBounds(bounds);
  const seed: ScholarshipProfileFilterSeed = {
    fieldOfStudy: null,
    schoolLevel: null,
    citizenship: 'international_student',
    stateInput: '',
    educationLevelIds: [],
    gpaBucketIds: [],
    eligibilityIds: []
  };
  const out = mergeBestRecommendationFiltersFromProfile(
    'recommended',
    base,
    seed,
    bounds
  );
  assert.equal(out.citizenshipAudience, 'international_friendly');
});

test('mergeBestRecommendationFiltersFromProfile keeps US domestic citizenship as a ranking signal on best-recommendation', () => {
  const base = defaultMoreFiltersFromBounds(bounds);
  const seed: ScholarshipProfileFilterSeed = {
    fieldOfStudy: 'engineering',
    schoolLevel: null,
    citizenship: 'us_citizen',
    stateInput: '',
    educationLevelIds: [],
    gpaBucketIds: [],
    eligibilityIds: []
  };
  const out = mergeBestRecommendationFiltersFromProfile(
    'best-recommendation',
    base,
    seed,
    bounds
  );
  assert.equal(out.profileFieldOfStudySlug, 'engineering');
  assert.equal(out.profileCitizenshipNarrow, 'none');
});

test('mergeBestRecommendationFiltersFromProfile still allows US domestic citizenship narrow on recommended', () => {
  const base = defaultMoreFiltersFromBounds(bounds);
  const seed: ScholarshipProfileFilterSeed = {
    fieldOfStudy: 'engineering',
    schoolLevel: null,
    citizenship: 'us_citizen',
    stateInput: '',
    educationLevelIds: [],
    gpaBucketIds: [],
    eligibilityIds: []
  };
  const out = mergeBestRecommendationFiltersFromProfile(
    'recommended',
    base,
    seed,
    bounds
  );
  assert.equal(out.profileFieldOfStudySlug, 'engineering');
  assert.equal(out.profileCitizenshipNarrow, 'us_domestic');
});

test('mergeBestRecommendationFiltersFromProfile keeps domestic plus unspecified as ranking-only on recommended', () => {
  const base = defaultMoreFiltersFromBounds(bounds);
  const seed: ScholarshipProfileFilterSeed = {
    fieldOfStudy: 'engineering',
    schoolLevel: null,
    citizenship: DOMESTIC_OR_UNSPECIFIED_CITIZENSHIP,
    stateInput: '',
    educationLevelIds: [],
    gpaBucketIds: [],
    eligibilityIds: []
  };
  const out = mergeBestRecommendationFiltersFromProfile(
    'recommended',
    base,
    seed,
    bounds
  );
  assert.equal(out.profileFieldOfStudySlug, 'engineering');
  assert.equal(out.profileCitizenshipNarrow, 'none');
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
    'best-recommendation',
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
    'best-recommendation',
    base,
    null,
    bounds
  );
  assert.equal(out.filterStateInput, 'Texas');
  out.filterStateInput = 'Changed';
  assert.equal(base.filterStateInput, 'Texas');
});

test('stripHubProfileHardMatchMoreFilters preserves applicant country hard filters', () => {
  const base = defaultMoreFiltersFromBounds(bounds);
  base.includeEducationLevels.add('undergraduate');
  base.profileFieldOfStudySlug = 'engineering';
  base.includeApplicantCountryCodes.add('CA');
  base.includeUnspecifiedApplicantCountries = false;

  const out = stripHubProfileHardMatchMoreFilters(base);

  assert.equal(out.includeEducationLevels.size, 0);
  assert.equal(out.profileFieldOfStudySlug, '');
  assert.deepEqual(out.includeApplicantCountryCodes, new Set(['CA']));
  assert.equal(out.includeUnspecifiedApplicantCountries, false);
  assert.equal(base.includeApplicantCountryCodes.has('CA'), true);
});

test('buildMoreFiltersWithProfileDefaults keeps selected applicant country exact by default', () => {
  const seed: ScholarshipProfileFilterSeed = {
    fieldOfStudy: null,
    schoolLevel: null,
    citizenship: null,
    applicantCountryCodes: ['CA'],
    stateInput: '',
    educationLevelIds: [],
    gpaBucketIds: [],
    eligibilityIds: []
  };

  const out = buildMoreFiltersWithProfileDefaults(bounds, seed);

  assert.deepEqual(out.includeApplicantCountryCodes, new Set(['CA']));
  assert.equal(out.includeUnspecifiedApplicantCountries, false);
});
