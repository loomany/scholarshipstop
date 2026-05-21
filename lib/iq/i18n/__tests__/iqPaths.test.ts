import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getIqLocalizedHref,
  getIqLanguageSwitcherItems
} from '@/lib/iq/i18n/iqLocalizedHref';
import {
  getIqLocaleFromPathname,
  iqInternalRewritePath,
  parseIqPublicPathname,
  pathnameHasForbiddenIqEnPrefix,
  stripIqLocalePrefix
} from '@/lib/iq/i18n/iqPaths';

test('parseIqPublicPathname parses es and fr prefixes', () => {
  assert.deepEqual(parseIqPublicPathname('/es'), {
    locale: 'es',
    pathnameWithoutLocale: '/'
  });
  assert.deepEqual(parseIqPublicPathname('/fr/assessment'), {
    locale: 'fr',
    pathnameWithoutLocale: '/assessment'
  });
});

test('iqInternalRewritePath maps public paths to app/iq routes', () => {
  assert.equal(iqInternalRewritePath('/'), '/iq');
  assert.equal(iqInternalRewritePath('/assessment'), '/iq/assessment');
  assert.equal(iqInternalRewritePath('/report/abc'), '/iq/report/abc');
  assert.equal(iqInternalRewritePath('/faq'), '/iq/faq');
});

test('getIqLocalizedHref builds subdomain assessment links', () => {
  assert.equal(
    getIqLocalizedHref('/assessment', 'es', { onIqSubdomain: true }),
    '/es/assessment'
  );
  assert.equal(
    getIqLocalizedHref('/assessment', 'en', { onIqSubdomain: true }),
    '/assessment'
  );
});

test('language switcher never emits /en', () => {
  const items = getIqLanguageSwitcherItems({
    pathname: '/es/assessment',
    onIqSubdomain: true
  });
  assert.equal(
    items.some((item) => item.href === '/en' || item.href.startsWith('/en/')),
    false
  );
});

test('pathnameHasForbiddenIqEnPrefix detects /en paths', () => {
  assert.equal(pathnameHasForbiddenIqEnPrefix('/en'), true);
  assert.equal(pathnameHasForbiddenIqEnPrefix('/en/assessment'), true);
  assert.equal(pathnameHasForbiddenIqEnPrefix('/es'), false);
});

test('getIqLocaleFromPathname reads locale from pathname', () => {
  assert.equal(getIqLocaleFromPathname('/fr/help'), 'fr');
  assert.equal(stripIqLocalePrefix('/fr/help'), '/help');
});
