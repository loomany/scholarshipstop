import test from 'node:test';
import assert from 'node:assert/strict';

import { buildEffectiveScholarshipFilters } from '@/lib/scholarships-v2/filters/effective';
import { resolveScholarshipsMode } from '@/lib/scholarships-v2/tabs/userCollections';

test('effective filter precedence keeps URL highest', () => {
  const out = buildEffectiveScholarshipFilters({
    mode: 'catalog',
    publicDefaults: { deadlinePreset: 'gt4w', includeEligibility: ['women'] },
    profileDefaults: { deadlinePreset: 'w1_4', includeEligibility: ['veterans'] },
    modalFilters: {
      applied: { deadlinePreset: 'd1_7', includeEligibility: ['minority'] },
      draft: { deadlinePreset: 'lt1d', includeEligibility: ['lgbtq_plus'] }
    },
    explicitUrlFilters: { deadlinePreset: 'any', includeEligibility: ['first_generation'] }
  });

  assert.equal(out.deadlinePreset, 'any');
  assert.deepEqual(out.includeEligibility, ['first_generation']);
});

test('mode resolution switches to userCollections when tab selected', () => {
  const out = buildEffectiveScholarshipFilters({
    mode: 'catalog',
    explicitUrlFilters: { userCollectionTab: 'ignored' }
  });

  assert.equal(resolveScholarshipsMode(out), 'userCollections');
});

test('top-priority facets exist on effective filters', () => {
  const out = buildEffectiveScholarshipFilters({
    mode: 'catalog',
    explicitUrlFilters: {
      includeEligibility: ['women'],
      includeGpaBuckets: ['gpa_3'],
      includeRequirementTypes: ['essay'],
      applicantsMin: 10,
      applicantsMax: 500,
      includeEasyApply: ['easy_apply'],
      dataCompleteness: { low: true, medium: false, high: false, verified: false },
      payout: { college: true, student: false, nonMonetary: false, notStated: false },
      savedIds: ['11111111-1111-1111-1111-111111111111'],
      categoryIds: ['stem'],
      categoryPageSlug: 'stem'
    }
  });

  assert.deepEqual(out.includeEligibility, ['women']);
  assert.deepEqual(out.includeGpaBuckets, ['gpa_3']);
  assert.deepEqual(out.includeRequirementTypes, ['essay']);
  assert.equal(out.applicantsMin, 10);
  assert.equal(out.applicantsMax, 500);
  assert.deepEqual(out.includeEasyApply, ['easy_apply']);
  assert.equal(out.dataCompleteness.low, true);
  assert.equal(out.payout.college, true);
  assert.deepEqual(out.savedIds, ['11111111-1111-1111-1111-111111111111']);
  assert.deepEqual(out.categoryIds, ['stem']);
  assert.equal(out.categoryPageSlug, 'stem');
});
