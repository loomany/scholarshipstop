import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeScholarshipDynamicParam } from '@/app/scholarships/scholarshipLongTailPresets';
import {
  getCrossCountryManifestEntryByCanonicalPath,
  getCrossCountryManifestEntryBySegments,
  listCrossCountrySitemapEntries
} from '@/lib/scholarships/seoCrossCountryManifest';
import { resolveScholarshipSlugPath } from '@/lib/scholarships/seoScholarshipResolve';

function normSegments(parts: string[]): string[] {
  return parts.map((s) => normalizeScholarshipDynamicParam(s));
}

test('cross-country: known allowlisted pair resolves as cross_country_seo', () => {
  const segments = normSegments([
    'for-students-from',
    'united-states',
    'study-in',
    'germany'
  ]);
  const r = resolveScholarshipSlugPath(segments);
  assert.equal(r.kind, 'cross_country_seo');
  if (r.kind === 'cross_country_seo') {
    assert.equal(r.entry.canonicalPath, 'for-students-from/united-states/study-in/germany');
    assert.equal(r.entry.status, 'approved_priority');
  }
});

test('cross-country: manual_review + noindex + enabled still resolves for SSR later', () => {
  const segments = normSegments([
    'for-students-from',
    'ukraine',
    'study-in',
    'germany'
  ]);
  const r = resolveScholarshipSlugPath(segments);
  assert.equal(r.kind, 'cross_country_seo');
  if (r.kind === 'cross_country_seo') {
    assert.equal(r.entry.status, 'manual_review');
    assert.equal(r.entry.robots, 'noindex,follow');
    assert.equal(r.entry.enabled, true);
  }
});

test('cross-country: unknown pair falls through to not_found', () => {
  const segments = normSegments([
    'for-students-from',
    'not-a-real-country-slug-xyz',
    'study-in',
    'also-fake-host-abc'
  ]);
  const r = resolveScholarshipSlugPath(segments);
  assert.equal(r.kind, 'not_found');
});

test('cross-country: wrong shape (not study-in) does not use manifest', () => {
  const segments = normSegments([
    'for-students-from',
    'united-states',
    'not-study-in',
    'germany'
  ]);
  const r = resolveScholarshipSlugPath(segments);
  assert.notEqual(r.kind, 'cross_country_seo');
});

test('getCrossCountryManifestEntryBySegments requires 4 segments and literals', () => {
  assert.equal(getCrossCountryManifestEntryBySegments([]), null);
  assert.equal(
    getCrossCountryManifestEntryBySegments(
      normSegments(['for-students-from', 'india', 'study-in'])
    ),
    null
  );
});

test('getCrossCountryManifestEntryByCanonicalPath trims slashes', () => {
  const e = getCrossCountryManifestEntryByCanonicalPath(
    '/for-students-from/canada/study-in/united-states/'
  );
  assert.ok(e);
  assert.equal(e!.canonicalPath, 'for-students-from/canada/study-in/united-states');
});

test('listCrossCountrySitemapEntries: only index,follow + sitemap + approved*', () => {
  const list = listCrossCountrySitemapEntries();
  assert.ok(list.length > 0);
  for (const e of list) {
    assert.equal(e.enabled, true);
    assert.equal(e.includeInSitemap, true);
    assert.equal(e.robots, 'index,follow');
    assert.ok(e.status === 'approved' || e.status === 'approved_priority');
  }
  const uaDe = list.find(
    (e) => e.applicantSlug === 'ukraine' && e.hostSlug === 'germany'
  );
  assert.equal(uaDe, undefined);
});

test('country_seo 2-segment applicant route unchanged', () => {
  const segments = normSegments(['for-students-from', 'united-kingdom']);
  const r = resolveScholarshipSlugPath(segments);
  assert.equal(r.kind, 'country_seo');
  if (r.kind === 'country_seo') {
    assert.equal(r.route.kind, 'applicant');
    assert.equal(r.route.slug, 'united-kingdom');
  }
});

test('country_seo 2-segment host route unchanged', () => {
  const segments = normSegments(['study-in', 'germany']);
  const r = resolveScholarshipSlugPath(segments);
  assert.equal(r.kind, 'country_seo');
  if (r.kind === 'country_seo') {
    assert.equal(r.route.kind, 'host');
  }
});
