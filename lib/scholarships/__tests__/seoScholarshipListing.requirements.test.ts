import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultMoreFiltersFromBounds } from '@/app/scholarships/moreFilters';
import { buildSeoExactRouteDescriptor } from '@/lib/scholarships/seoScholarshipListing';

test('SEO exact descriptor keeps includeRequirementTypes instead of silently clearing them', () => {
  const base = defaultMoreFiltersFromBounds({
    amountMin: 0,
    amountMax: 10000,
    applicantsMin: 0,
    applicantsMax: 1000
  });
  base.includeRequirementTypes.add('essay');

  const descriptor = buildSeoExactRouteDescriptor(
    {
      amountMin: 0,
      amountMax: 10000,
      applicantsMin: 0,
      applicantsMax: 1000
    },
    'for-women/no-essay',
    base
  );

  assert.equal(descriptor.moreFilters.includeRequirementTypes.has('essay'), true);
});
