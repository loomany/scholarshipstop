import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultMoreFiltersFromBounds } from '@/app/scholarships/moreFilters';
import {
  moreFiltersFromJson,
  moreFiltersToJson
} from '@/lib/scholarships/scholarshipListApiCodec';

const bounds = {
  amountMin: 0,
  amountMax: 5000,
  applicantsMin: 0,
  applicantsMax: 500
};

test('moreFilters codec preserves eligibility and education arrays across json round-trip', () => {
  const state = defaultMoreFiltersFromBounds(bounds);
  state.includeEligibility = new Set(['women', 'veterans', 'low_income']);
  state.includeEducationLevels = new Set(['undergraduate', 'graduate']);

  const encoded = moreFiltersToJson(state);
  assert.deepEqual(encoded.includeEligibility.sort(), ['low_income', 'veterans', 'women']);
  assert.deepEqual(encoded.includeEducationLevels.sort(), ['graduate', 'undergraduate']);

  const decoded = moreFiltersFromJson(encoded, bounds);
  assert.deepEqual(Array.from(decoded.includeEligibility).sort(), ['low_income', 'veterans', 'women']);
  assert.deepEqual(Array.from(decoded.includeEducationLevels).sort(), ['graduate', 'undergraduate']);
});
