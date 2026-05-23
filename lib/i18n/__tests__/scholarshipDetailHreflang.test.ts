import assert from 'node:assert/strict';
import test from 'node:test';

import { buildLocalizedAlternates } from '@/lib/i18n/alternates';

test('buildLocalizedAlternates emits reciprocal en/es/fr cluster for scholarship detail', () => {
  const slug = 'climate-stripes-scholarship-14487';
  const path = `/scholarships/${slug}`;
  const alternates = buildLocalizedAlternates({
    canonicalPath: path,
    currentLocale: 'en',
    availableLocales: ['en', 'es', 'fr'],
    defaultUrl: `https://scholarshiptop.com${path}`
  });

  assert.equal(
    alternates.canonical,
    `https://scholarshiptop.com/scholarships/${slug}`
  );
  assert.equal(alternates.languages?.en, alternates.canonical);
  assert.equal(
    alternates.languages?.es,
    `https://scholarshiptop.com/es/scholarships/${slug}`
  );
  assert.equal(
    alternates.languages?.fr,
    `https://scholarshiptop.com/fr/scholarships/${slug}`
  );
  assert.equal(alternates.languages?.['x-default'], alternates.canonical);
  assert.equal(alternates.languages?.['en'], alternates.languages?.['x-default']);
});

test('buildLocalizedAlternates omits es/fr when only English is published', () => {
  const path = '/scholarships/untranslated-only-slug';
  const alternates = buildLocalizedAlternates({
    canonicalPath: path,
    currentLocale: 'en',
    availableLocales: ['en'],
    defaultUrl: `https://scholarshiptop.com${path}`
  });

  assert.equal(alternates.languages?.es, undefined);
  assert.equal(alternates.languages?.fr, undefined);
  assert.equal(alternates.languages?.['x-default'], alternates.canonical);
});
