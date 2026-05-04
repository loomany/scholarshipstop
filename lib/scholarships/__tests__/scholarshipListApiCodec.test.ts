import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultMoreFiltersFromBounds } from '@/app/scholarships/moreFilters';
import { moreFiltersFromJson, moreFiltersToJson } from '@/lib/scholarships/scholarshipListApiCodec';

test('eligibility and education filters roundtrip through moreFilters JSON codec', () => {
  const base = defaultMoreFiltersFromBounds({
    amountMin: 0,
    amountMax: 10000,
    applicantsMin: 0,
    applicantsMax: 1000
  });
  base.includeEligibility.add('women');
  base.includeEligibility.add('veterans');
  base.includeEducationLevels.add('undergraduate');
  base.includeEducationLevels.add('graduate');

  const encoded = moreFiltersToJson(base);
  const decoded = moreFiltersFromJson(encoded, {
    amountMin: 0,
    amountMax: 10000,
    applicantsMin: 0,
    applicantsMax: 1000
  });

  assert.deepEqual(new Set(encoded.includeEligibility), new Set(['women', 'veterans']));
  assert.deepEqual(new Set(encoded.includeEducationLevels), new Set(['undergraduate', 'graduate']));
  assert.deepEqual(decoded.includeEligibility, new Set(['women', 'veterans']));
  assert.deepEqual(decoded.includeEducationLevels, new Set(['undergraduate', 'graduate']));
});

test('include unspecified host country flag roundtrips through moreFilters JSON codec', () => {
  const base = defaultMoreFiltersFromBounds({
    amountMin: 0,
    amountMax: 10000,
    applicantsMin: 0,
    applicantsMax: 1000
  });
  base.includeUnspecifiedHostCountries = true;

  const encoded = moreFiltersToJson(base);
  const decoded = moreFiltersFromJson(encoded, {
    amountMin: 0,
    amountMax: 10000,
    applicantsMin: 0,
    applicantsMax: 1000
  });

  assert.equal(encoded.includeUnspecifiedHostCountries, true);
  assert.equal(decoded.includeUnspecifiedHostCountries, true);
});

test('applicant country and unspecified country flag roundtrip through moreFilters JSON codec', () => {
  const base = defaultMoreFiltersFromBounds({
    amountMin: 0,
    amountMax: 10000,
    applicantsMin: 0,
    applicantsMax: 1000
  });
  base.includeApplicantCountryCodes.add('CA');
  base.includeUnspecifiedApplicantCountries = true;

  const encoded = moreFiltersToJson(base);
  const decoded = moreFiltersFromJson(encoded, {
    amountMin: 0,
    amountMax: 10000,
    applicantsMin: 0,
    applicantsMax: 1000
  });

  assert.deepEqual(encoded.includeApplicantCountryCodes, ['CA']);
  assert.equal(encoded.includeUnspecifiedApplicantCountries, true);
  assert.deepEqual(decoded.includeApplicantCountryCodes, new Set(['CA']));
  assert.equal(decoded.includeUnspecifiedApplicantCountries, true);
});

test('student profile filters roundtrip through moreFilters JSON codec', () => {
  const base = defaultMoreFiltersFromBounds({
    amountMin: 0,
    amountMax: 10000,
    applicantsMin: 0,
    applicantsMax: 1000
  });
  base.profileSchoolLevelSlug = 'college_1';
  base.profileFieldOfStudySlug = 'engineering';
  base.profileCitizenshipStatus = 'international_student';
  base.gpaChoice = '3.4';
  base.filterStateInput = 'Florida';

  const encoded = moreFiltersToJson(base);
  const decoded = moreFiltersFromJson(encoded, {
    amountMin: 0,
    amountMax: 10000,
    applicantsMin: 0,
    applicantsMax: 1000
  });

  assert.equal(encoded.profileSchoolLevelSlug, 'college_1');
  assert.equal(encoded.profileFieldOfStudySlug, 'engineering');
  assert.equal(encoded.profileCitizenshipStatus, 'international_student');
  assert.equal(encoded.gpaChoice, '3.4');
  assert.equal(decoded.profileSchoolLevelSlug, 'college_1');
  assert.equal(decoded.profileFieldOfStudySlug, 'engineering');
  assert.equal(decoded.profileCitizenshipStatus, 'international_student');
  assert.equal(decoded.gpaChoice, '3.4');
  assert.equal(decoded.filterStateInput, 'Florida');
});
