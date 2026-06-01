import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDedicatedResourceGuideSitemapEntries } from '@/lib/seo/dedicatedResourceGuideSitemap';

const BASE = 'https://scholarshiptop.com';

test('dedicated resource guide sitemap includes medical scholarships guide', () => {
  const entries = buildDedicatedResourceGuideSitemapEntries(BASE);
  assert.ok(
    entries.some((e) =>
      e.url.endsWith('/resources/medical-scholarships-guide')
    ),
    'expected medical-scholarships-guide in resources sitemap entries'
  );
});

test('dedicated resource guide sitemap excludes STATIC_SCHOLARSHIP_GUIDES slugs', () => {
  const entries = buildDedicatedResourceGuideSitemapEntries(BASE);
  assert.ok(
    !entries.some((e) => e.url.endsWith('/resources/how-to-find-scholarships')),
    'how-to-find-scholarships is already in STATIC_SCHOLARSHIP_GUIDES'
  );
});
