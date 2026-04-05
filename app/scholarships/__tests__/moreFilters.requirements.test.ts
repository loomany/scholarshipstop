import test from 'node:test';
import assert from 'node:assert/strict';

import {
  defaultMoreFiltersFromBounds,
  scholarshipPassesMoreFilters
} from '@/app/scholarships/moreFilters';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';

function scholarshipFixture(): Scholarship {
  return {
    id: 'row-1',
    title: 'Fixture Scholarship',
    deadline: '2026-12-31',
    awardAmountNumericSort: 1000,
    applicantCount: 15,
    payoutMethod: 'college'
  } as unknown as Scholarship;
}

test('client-side more-filters no longer filter by include-only requirement/eligibility/education groups', () => {
  const baseline = defaultMoreFiltersFromBounds({
    amountMin: 0,
    amountMax: 5000,
    applicantsMin: 0,
    applicantsMax: 500
  });

  const withRequirement = {
    ...baseline,
    includeRequirementTypes: new Set(['essay'])
  };
  const withEligibility = {
    ...baseline,
    includeEligibility: new Set(['women', 'veterans'])
  };
  const withEducation = {
    ...baseline,
    includeEducationLevels: new Set(['undergraduate', 'graduate'])
  };

  const scholarship = scholarshipFixture();

  assert.equal(scholarshipPassesMoreFilters(scholarship, baseline), true);
  assert.equal(scholarshipPassesMoreFilters(scholarship, withRequirement), true);
  assert.equal(scholarshipPassesMoreFilters(scholarship, withEligibility), true);
  assert.equal(scholarshipPassesMoreFilters(scholarship, withEducation), true);
});
