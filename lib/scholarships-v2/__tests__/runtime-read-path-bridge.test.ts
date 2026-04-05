import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultMoreFiltersFromBounds } from '@/app/scholarships/moreFilters';
import type { ScholarshipListRequest } from '@/lib/scholarships/scholarshipListServer';
import { applyV2ReadPathToLegacyRequest } from '@/lib/scholarships-v2/runtime/applyV2ReadPathToLegacyRequest';

function baseRequest(): ScholarshipListRequest {
  return {
    page: 1,
    limit: 12,
    sort: 'magic',
    tab: 'matches',
    q: '',
    categoryIds: new Set(),
    categoryPageSlug: null,
    deadline: 'any',
    stateCodes: [],
    ignored: [],
    saved: [],
    started: [],
    submitted: [],
    moreFilters: defaultMoreFiltersFromBounds({
      amountMin: 0,
      amountMax: 50000,
      applicantsMin: 0,
      applicantsMax: 200000
    }),
    longTailLegacySlugs: [],
    similarToId: null,
    similarCategorySlug: null,
    listScope: 'catalog',
    requiredSeoTags: [],
    catalogSubjectCategoryId: null,
    personalizedBestIds: [],
    personalizedRecommendedIds: [],
    personalizedMode: false
  };
}

test('applyV2ReadPathToLegacyRequest only rewrites URL-derived listing fields', () => {
  const req = baseRequest();
  const out = applyV2ReadPathToLegacyRequest({
    request: req,
    searchParams: new URLSearchParams(
      'tab=saved&q=first%20gen&deadline=gt_4w&state=Florida&saved=11111111-1111-1111-1111-111111111111'
    ),
    moreFilters: {
      deadlinePreset: 'd1_7',
      amountMin: 50,
      amountMax: 9000,
      applicantsMin: 2,
      applicantsMax: 100,
      includeRequirementTypes: ['resume', 'essay'],
      dataCompleteness: { low: false, medium: true, high: false, verified: true },
      payout: { college: false, student: true, nonMonetary: false, notStated: false },
      includeEligibility: ['first_generation'],
      includeEducationLevels: ['undergraduate'],
      includeGpaBuckets: ['gpa_3'],
      includeLocationLabels: ['California'],
      includeEasyApply: ['easy_apply'],
      filterStateInput: 'Florida'
    }
  });

  assert.equal(out.q, 'first gen');
  assert.equal(out.tab, 'saved');
  assert.deepEqual(out.saved, ['11111111-1111-1111-1111-111111111111']);
  assert.deepEqual(out.stateCodes, ['FL']);
  assert.equal(out.deadline, 'gt4w');
  assert.equal(out.moreFilters, req.moreFilters);
});
