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
