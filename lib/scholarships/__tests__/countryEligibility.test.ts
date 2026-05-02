import test from 'node:test';
import assert from 'node:assert/strict';

import { parseScholarshipCountryEligibility } from '@/lib/scholarships/countryEligibility/parseScholarshipCountryEligibility';

test('parses U.S. resident applicant eligibility', () => {
  assert.deepEqual(
    parseScholarshipCountryEligibility({
      eligibilityText: 'Resident of the U.S. Attend Loyola University Chicago'
    }).applicantCountryCodes,
    ['US']
  );

  assert.deepEqual(
    parseScholarshipCountryEligibility({
      eligibilityText: 'U.S. residents may apply.'
    }).applicantCountryCodes,
    ['US']
  );
});

test('keeps applicant country and host country as separate signals', () => {
  const parsed = parseScholarshipCountryEligibility({
    eligibilityText: 'Open to students from Mexico and Canada.',
    requirementsText: 'Students must study in the U.S.'
  });

  assert.deepEqual(parsed.applicantCountryCodes, ['CA', 'MX']);
  assert.deepEqual(parsed.hostCountryCodes, ['US']);
});

test('parses host country from raw listing location text', () => {
  const parsed = parseScholarshipCountryEligibility({
    title: "Strathclyde Business School Dean's Excellence award",
    rawData: {
      listing: {
        location_text: 'Glasgow, United Kingdom'
      }
    }
  });

  assert.deepEqual(parsed.hostCountryCodes, ['GB']);
});
