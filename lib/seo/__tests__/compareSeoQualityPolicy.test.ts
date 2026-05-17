import assert from 'node:assert/strict';
import test from 'node:test';

import { getCompareSeoQualityPolicy } from '@/lib/seo/compareSeoQualityPolicy';

test('compare quality passes evergreen public guide pages', () => {
  const result = getCompareSeoQualityPolicy({
    stablePublicRoute: true,
    hasQueryParams: false,
    hasSearchIntent: true,
    hasUniqueComparisonTable: true,
    hasVisibleFaq: true,
    hasRelatedInternalLinks: true,
    meaningfulFactCount: 3
  });

  assert.equal(result.indexable, true);
  assert.equal(result.includeInSitemap, true);
});

test('compare quality excludes query-param and user-specific pages', () => {
  const result = getCompareSeoQualityPolicy({
    stablePublicRoute: false,
    hasQueryParams: true,
    userSpecific: true,
    hasSearchIntent: true,
    hasUniqueComparisonTable: true,
    hasVisibleFaq: true,
    hasRelatedInternalLinks: true,
    meaningfulFactCount: 3
  });

  assert.equal(result.indexable, false);
  assert.equal(result.includeInSitemap, false);
  assert.equal(result.reasons.includes('Query params define the page.'), true);
});
