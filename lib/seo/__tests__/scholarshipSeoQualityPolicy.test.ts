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

test('scholarship SEO route quality promotes no-essay as priority legacy winner with content', () => {
  const result = getScholarshipSeoRouteQualityPolicy({
    canonicalPath: 'no-essay',
    routeFamily: 'legacy_long_tail',
    seoContent: {
      seo_title: 'No Essay Scholarships 2026 USA | Find & Apply',
      seo_description:
        'Browse USA scholarships for 2026 with no essay flagged in our catalog. Explore deadlines, sort by date, and open official listings before you apply.',
      intro:
        'If you want to apply faster in 2026 without drafting a long personal essay, use this USA scholarship list to find programs our catalog does not flag as essay-required. Browse amounts and deadlines in one place, search with keywords, and explore filters that match how you like to work. When you spot a fit, open the official listing to confirm steps, gather materials, and submit on the sponsor site with a clear plan.',
      supporting:
        'No essay does not always mean no work. Some awards still ask for a profile, transcript, recommendation, short answer, proof of enrollment, or eligibility confirmation. Prioritize listings with a clear provider, current deadline, visible award amount, and simple requirements, then save the strongest fits before moving to the official application page.',
      how_to_use: [
        'Sort by closest deadline when you have time this week, or by highest amount when you want to compare value first.',
        'Open the scholarship detail page before applying so you can confirm provider, eligibility, deadline, and required materials.',
        'Use no-essay listings as quick applications, but keep a shortlist of essay-based awards if they match your profile more strongly.'
      ],
      who_for: [
        'Students who need fast scholarship applications between larger essay deadlines.',
        'Applicants who want lower-writing-effort awards with visible deadline and award data.'
      ],
      faq: [
        {
          question: 'Are no essay scholarships legitimate?',
          answer:
            'Some are legitimate, but the provider, deadline, eligibility rules, and application destination should still be checked before applying.'
        },
        {
          question: 'Do no essay scholarships require any documents?',
          answer:
            'They may still require account details, enrollment proof, recommendations, transcripts, or other materials even when no essay is flagged.'
        }
      ]
    },
    stablePublicRoute: true,
    routeResolves: true,
    hasQueryParams: false
  });

  assert.equal(result.routeFamily, 'legacy_long_tail');
  assert.equal(result.shouldIndex, true);
  assert.equal(result.shouldIncludeInSitemap, true);
  assert.equal(result.shouldBeRssEligible, true);
  assert.deepEqual(result.reasonCodes, ['priority_legacy_long_tail_route']);
});

test('scholarship SEO route quality keeps no-essay noindex without content bundle', () => {
  const result = getScholarshipSeoRouteQualityPolicy({
    canonicalPath: 'no-essay',
    routeFamily: 'legacy_long_tail',
    stablePublicRoute: true,
    routeResolves: true,
    hasQueryParams: false
  });

  assert.equal(result.routeFamily, 'legacy_long_tail');
  assert.equal(result.shouldIndex, false);
  assert.equal(result.shouldIncludeInSitemap, false);
  assert.equal(
    result.reasonCodes.includes(
      'legacy_long_tail_below_visible_content_threshold'
    ),
    true
  );
});
