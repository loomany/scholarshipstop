import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyScholarshipSeoRouteFamily,
  getScholarshipSeoRouteQualityPolicy
} from '@/lib/seo/scholarshipSeoQualityPolicy';
import { getSeoManifestRoute } from '@/lib/scholarships/seoScholarshipResolve';

test('scholarship SEO route quality excludes dynamic state landing pages', () => {
  const result = getScholarshipSeoRouteQualityPolicy({
    canonicalPath: 'california',
    stablePublicRoute: true,
    routeResolves: true,
    hasQueryParams: false
  });

  assert.equal(result.routeFamily, 'dynamic_state');
  assert.equal(result.shouldIndex, false);
  assert.equal(result.shouldIncludeInSitemap, false);
  assert.equal(result.shouldBeRssEligible, false);
  assert.equal(
    result.reasonCodes.includes(
      'dynamic_scholarship_filter_route_requires_explicit_quality_approval'
    ),
    true
  );
});

test('scholarship SEO route quality excludes unpromoted legacy long-tail pages', () => {
  const result = getScholarshipSeoRouteQualityPolicy({
    canonicalPath: 'undergraduate',
    stablePublicRoute: true,
    routeResolves: true,
    hasQueryParams: false
  });

  assert.equal(result.routeFamily, 'legacy_long_tail');
  assert.equal(result.shouldIndex, false);
  assert.equal(result.shouldIncludeInSitemap, false);
  assert.equal(
    result.reasonCodes.includes('legacy_long_tail_not_promoted_for_sitemap'),
    true
  );
});

test('scholarship SEO route quality excludes dynamic state-degree-topic pages', () => {
  const result = getScholarshipSeoRouteQualityPolicy({
    canonicalPath: 'connecticut/high-school/nursing',
    stablePublicRoute: true,
    routeResolves: true,
    hasQueryParams: false
  });

  assert.equal(result.routeFamily, 'dynamic_state_degree_topic');
  assert.equal(result.shouldIndex, false);
  assert.equal(result.shouldIncludeInSitemap, false);
});

test('scholarship SEO route quality keeps curated GOOD manifest pages indexable', () => {
  const entry = getSeoManifestRoute('engineering');
  assert.ok(entry);

  const result = getScholarshipSeoRouteQualityPolicy({
    canonicalPath: 'engineering',
    entry,
    stablePublicRoute: true,
    routeResolves: true,
    hasQueryParams: false
  });

  assert.equal(
    classifyScholarshipSeoRouteFamily({ canonicalPath: 'engineering', entry }),
    'manifest_single'
  );
  assert.equal(result.shouldIndex, true);
  assert.equal(result.shouldIncludeInSitemap, true);
  assert.equal(result.shouldBeRssEligible, true);
});

test('scholarship SEO route quality keeps approved cross-country routes out of thin-route cleanup', () => {
  const result = getScholarshipSeoRouteQualityPolicy({
    canonicalPath: 'for-students-from/canada/study-in/united-states',
    routeFamily: 'cross_country_seo',
    stablePublicRoute: true,
    routeResolves: true,
    hasQueryParams: false
  });

  assert.equal(result.shouldIndex, true);
  assert.equal(result.shouldIncludeInSitemap, true);
  assert.equal(result.shouldBeRssEligible, false);
});
