import assert from 'node:assert/strict';
import test from 'node:test';

import { getLocaleDirection } from '@/lib/i18n/locales';
import {
  extractLocaleFromPath,
  localizedPath,
  normalizeCanonicalPath,
  stripLocalePrefix
} from '@/lib/i18n/paths';
import { getLocalizedCanonical } from '@/lib/seo/canonical';

test('English root paths remain unprefixed', () => {
  assert.equal(localizedPath('en', '/scholarships'), '/scholarships');
  assert.equal(localizedPath('en', '/'), '/');
  assert.equal(
    getLocalizedCanonical('/scholarships', 'en'),
    'https://scholarshiptop.com/scholarships'
  );
});

test('non-root locales receive locale prefixes', () => {
  assert.equal(localizedPath('es', '/scholarships'), '/es/scholarships');
  assert.equal(localizedPath('fr', '/essays/checklist'), '/fr/essays/checklist');
  assert.equal(localizedPath('ar', '/'), '/ar');
  assert.equal(
    getLocalizedCanonical('/compare/scholarship-vs-grant', 'fr'),
    'https://scholarshiptop.com/fr/compare/scholarship-vs-grant'
  );
});

test('locale extraction and stripping use non-English prefixes only', () => {
  assert.equal(extractLocaleFromPath('/es/scholarships'), 'es');
  assert.equal(stripLocalePrefix('/es/scholarships'), '/scholarships');
  assert.equal(extractLocaleFromPath('/zh-Hans/resources'), 'zh-Hans');
  assert.equal(stripLocalePrefix('/zh-Hans/resources'), '/resources');
  assert.equal(extractLocaleFromPath('/en/scholarships'), null);
  assert.equal(stripLocalePrefix('/en/scholarships'), '/en/scholarships');
});

test('canonical path normalization strips query strings and trailing slashes', () => {
  assert.equal(normalizeCanonicalPath('/scholarships/?page=2'), '/scholarships');
  assert.equal(
    normalizeCanonicalPath('https://scholarshiptop.com/essays/checklist?x=1'),
    '/essays/checklist'
  );
});

test('Arabic direction is rtl and other supported locales are ltr', () => {
  assert.equal(getLocaleDirection('ar'), 'rtl');
  assert.equal(getLocaleDirection('es'), 'ltr');
  assert.equal(getLocaleDirection('en'), 'ltr');
});

