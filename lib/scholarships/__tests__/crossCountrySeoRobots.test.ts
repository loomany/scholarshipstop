import test from 'node:test';
import assert from 'node:assert/strict';

import type { CrossCountryManifestEntry } from '@/lib/scholarships/seoCrossCountryManifest';
import {
  crossCountryListingRobotsFromManifest,
  getCrossCountryManifestEntryByCanonicalPath
} from '@/lib/scholarships/seoCrossCountryManifest';
import { getCanonical } from '@/lib/seo/canonical';

function partialEntry(
  overrides: Partial<CrossCountryManifestEntry>
): CrossCountryManifestEntry {
  return {
    applicantCode: 'US',
    hostCode: 'DE',
    applicantSlug: 'united-states',
    hostSlug: 'germany',
    canonicalPath: 'for-students-from/united-states/study-in/germany',
    href: '/scholarships/for-students-from/united-states/study-in/germany',
    h1: 'H1',
    metaTitle: 'Meta',
    metaDescription: 'Desc',
    intro: 'Intro',
    faqQuestions: [],
    totalCountSnapshot: 10,
    tier: 'x',
    qaStatus: 'auto_pass',
    duplicateRisk: 'low',
    unspecifiedRisk: 'low',
    status: 'approved_priority',
    robots: 'index,follow',
    includeInSitemap: true,
    allowedForAds: false,
    enabled: true,
    ...overrides
  };
}

test('robots: approved_priority + index,follow → indexable', () => {
  const r = crossCountryListingRobotsFromManifest(
    partialEntry({ status: 'approved_priority', robots: 'index,follow' })
  );
  assert.deepEqual(r, { index: true, follow: true });
});

test('robots: approved + index,follow → indexable', () => {
  const r = crossCountryListingRobotsFromManifest(
    partialEntry({ status: 'approved', robots: 'index,follow' })
  );
  assert.deepEqual(r, { index: true, follow: true });
});

test('robots: manual_review forces noindex even if robots string is wrong', () => {
  const r = crossCountryListingRobotsFromManifest(
    partialEntry({ status: 'manual_review', robots: 'index,follow' })
  );
  assert.deepEqual(r, { index: false, follow: true });
});

test('robots: published_noindex forces noindex', () => {
  const r = crossCountryListingRobotsFromManifest(
    partialEntry({ status: 'published_noindex', robots: 'index,follow' })
  );
  assert.deepEqual(r, { index: false, follow: true });
});

test('robots: approved_priority but noindex manifest → noindex', () => {
  const r = crossCountryListingRobotsFromManifest(
    partialEntry({ status: 'approved_priority', robots: 'noindex,follow' })
  );
  assert.deepEqual(r, { index: false, follow: true });
});

test('canonical from manifest href is origin + path without query', () => {
  const entry = getCrossCountryManifestEntryByCanonicalPath(
    'for-students-from/india/study-in/united-states'
  );
  assert.ok(entry);
  const c = getCanonical(entry!.href);
  assert.equal(
    c,
    'https://scholarshiptop.com/scholarships/for-students-from/india/study-in/united-states'
  );
  assert.ok(!c.includes('?'));
});
