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

test('compare quality noindexes thin localized pages without a comparison table', () => {
  const result = getCompareSeoQualityPolicy({
    stablePublicRoute: true,
    hasQueryParams: false,
    hasSearchIntent: true,
    hasUniqueComparisonTable: false,
    hasVisibleFaq: false,
    hasRelatedInternalLinks: true,
    meaningfulFactCount: 1,
    localized: true,
    hasLocalizedTitle: true,
    hasLocalizedH1: true,
    hasLocalizedBody: true,
    visibleWordCount: 211,
    minimumVisibleWords: 700
  });

  assert.equal(result.indexable, false);
  assert.equal(result.includeInSitemap, false);
  assert.equal(result.reasons.includes('Unique comparison table is missing.'), true);
  assert.equal(result.reasons.includes('Visible content is below 700 useful words.'), true);
});
