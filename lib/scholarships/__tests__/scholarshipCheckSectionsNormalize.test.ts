import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeScholarshipCheckSections,
  SCHOLARSHIP_PAYOUT_DETAILS_TO_CONFIRM
} from '@/lib/scholarships/scholarshipCheckSectionsNormalize';

test('Case 1: payout-only red flag and missing → empty red flags, canonical details', () => {
  const out = normalizeScholarshipCheckSections({
    importantChecks: [],
    missingOrUnclear: ['Specific payout method details'],
    redFlags: ['Payout method is not stated']
  });

  assert.deepEqual(out.redFlags, []);
  for (const line of SCHOLARSHIP_PAYOUT_DETAILS_TO_CONFIRM) {
    assert.ok(
      out.detailsToConfirm.some((x) => x.toLowerCase() === line.toLowerCase()),
      `expected detailsToConfirm to include: ${line}`
    );
  }
});

test('Case 2: serious risk stays in red flags; payout stripped', () => {
  const out = normalizeScholarshipCheckSections({
    importantChecks: [],
    missingOrUnclear: [],
    redFlags: ['Application fee required', 'Payout method is not stated']
  });

  assert.deepEqual(out.redFlags, ['Application fee required']);
  for (const line of SCHOLARSHIP_PAYOUT_DETAILS_TO_CONFIRM) {
    assert.ok(out.detailsToConfirm.some((x) => x === line));
  }
});

test('Case 3: bank details before award stays a red flag', () => {
  const line = 'Provider asks for bank details before award';
  const out = normalizeScholarshipCheckSections({
    importantChecks: [],
    missingOrUnclear: [],
    redFlags: [line]
  });

  assert.deepEqual(out.redFlags, [line]);
  assert.equal(out.detailsToConfirm.length, 0);
});

test('Case 4: only vague missing payout line → soft canonical wording, no duplicate payout bullets', () => {
  const out = normalizeScholarshipCheckSections({
    importantChecks: [],
    missingOrUnclear: ['Specific payout method details'],
    redFlags: []
  });

  assert.deepEqual(out.detailsToConfirm, [...SCHOLARSHIP_PAYOUT_DETAILS_TO_CONFIRM]);
  assert.ok(!out.detailsToConfirm.some((x) => /specific payout method/i.test(x)));
});
