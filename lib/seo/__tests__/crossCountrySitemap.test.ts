import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCrossCountrySeoSitemapEntries } from '@/lib/seo/crossCountrySitemapEntries';
import { canonicalPathAllowedInSeoSitemap } from '@/lib/seo/seoDripFeed';
import { listCrossCountrySitemapEntries } from '@/lib/scholarships/seoCrossCountryManifest';

test('listCrossCountrySitemapEntries: count 28', () => {
  assert.equal(listCrossCountrySitemapEntries().length, 28);
});

test('listCrossCountrySitemapEntries: only approved / approved_priority', () => {
  for (const e of listCrossCountrySitemapEntries()) {
    assert.ok(e.status === 'approved' || e.status === 'approved_priority');
    assert.equal(e.robots, 'index,follow');
    assert.equal(e.includeInSitemap, true);
    assert.equal(e.enabled, true);
  }
});

test('listCrossCountrySitemapEntries: includes India → United States', () => {
  const list = listCrossCountrySitemapEntries();
  assert.ok(
    list.some(
      (e) =>
        e.href === '/scholarships/for-students-from/india/study-in/united-states'
    )
  );
});

test('listCrossCountrySitemapEntries: excludes Ukraine → Germany manual_review', () => {
  const list = listCrossCountrySitemapEntries();
  assert.ok(!list.some((e) => e.applicantSlug === 'ukraine' && e.hostSlug === 'germany'));
});

test('listCrossCountrySitemapEntries: Germany host limited to 6', () => {
  const de = listCrossCountrySitemapEntries().filter((e) => e.hostCode === 'DE');
  assert.equal(de.length, 6);
});

test('listCrossCountrySitemapEntries: excludes published_noindex low-count example', () => {
  const list = listCrossCountrySitemapEntries();
  assert.ok(
    !list.some(
      (e) =>
        e.canonicalPath ===
        'for-students-from/united-states/study-in/congo-kinshasa'
    )
  );
});

test('buildCrossCountrySeoSitemapEntries: URLs are base + href, no query', () => {
  const base = 'https://scholarshiptop.com';
  const entries = buildCrossCountrySeoSitemapEntries(base);
  const expectedLen = listCrossCountrySitemapEntries().filter((e) =>
    canonicalPathAllowedInSeoSitemap(e.canonicalPath)
  ).length;
  assert.equal(entries.length, expectedLen);
  const indiaUs = entries.find((x) =>
    x.url.endsWith('/scholarships/for-students-from/india/study-in/united-states')
  );
  assert.ok(indiaUs);
  assert.ok(!indiaUs!.url.includes('?'));
  assert.ok(!entries.some((x) => x.url.includes('?')));
});
