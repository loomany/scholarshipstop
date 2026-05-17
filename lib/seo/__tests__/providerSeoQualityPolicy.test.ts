import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getProviderSeoQualityPolicy,
  isClearProviderDisplayName
} from '@/lib/seo/providerSeoQualityPolicy';

test('provider quality passes clear public provider with active scholarships', () => {
  const result = getProviderSeoQualityPolicy({
    slug: 'example-foundation',
    displayName: 'Example Foundation',
    activeScholarshipCount: 4,
    officialUrl: 'https://example.org',
    hasDescription: true,
    hasPublicScholarshipList: true,
    hasSourceTrustContext: true,
    routeResolves: true
  });

  assert.equal(result.indexable, true);
  assert.equal(result.includeInSitemap, true);
  assert.equal(result.sourceStatus, 'official_source_available');
  assert.equal(result.dataCompleteness, 'strong');
});

test('provider quality excludes unresolved or empty providers', () => {
  const result = getProviderSeoQualityPolicy({
    slug: 'unknown',
    displayName: 'Unknown',
    activeScholarshipCount: 0,
    hasPublicScholarshipList: false,
    hasSourceTrustContext: true,
    routeResolves: false
  });

  assert.equal(result.indexable, false);
  assert.equal(result.includeInSitemap, false);
  assert.equal(result.reasons.some((r) => r.includes('route')), true);
});

test('provider display name guard rejects sentence-like names', () => {
  assert.equal(isClearProviderDisplayName('Loyola University Chicago'), true);
  assert.equal(
    isClearProviderDisplayName('This provider offers scholarships. Apply now.'),
    false
  );
});
