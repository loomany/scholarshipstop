import assert from 'node:assert/strict';
import test from 'node:test';

import { getStage2LanguageSwitcherItems } from '@/lib/i18n/localizedHref';

test('language switcher shows English, Spanish, and French for translated routes', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/es/compare/scholarship-vs-grant'
  });
  assert.deepEqual(
    items.map((item) => [item.locale, item.href, item.current]),
    [
      ['en', '/compare/scholarship-vs-grant', false],
      ['es', '/es/compare/scholarship-vs-grant', true],
      ['fr', '/fr/compare/scholarship-vs-grant', false]
    ]
  );
});

test('language switcher is hidden for routes outside the pilot', () => {
  assert.deepEqual(
    getStage2LanguageSwitcherItems({ pathname: '/scholarships/not-pilot' }),
    []
  );
});

test('English pages link to available Spanish and French translations', () => {
  const items = getStage2LanguageSwitcherItems({ pathname: '/essays/checklist' });
  assert.equal(items[0]?.current, true);
  assert.equal(items[1]?.href, '/es/essays/checklist');
  assert.equal(items[2]?.href, '/fr/essays/checklist');
});

test('language switcher covers /scholarships/hub/* English hub tab paths', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/scholarships/hub/best-recommendation'
  });
  assert.deepEqual(
    items.map((item) => [item.locale, item.href, item.current]),
    [
      ['en', '/scholarships/hub/best-recommendation', true],
      ['es', '/es/scholarships/hub/best-recommendation', false],
      ['fr', '/fr/scholarships/hub/best-recommendation', false]
    ]
  );
});

test('language switcher on /es/scholarships/hub/<tab> links to EN and FR equivalents', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/es/scholarships/hub/easy-apply'
  });
  assert.deepEqual(
    items.map((item) => [item.locale, item.href, item.current]),
    [
      ['en', '/scholarships/hub/easy-apply', false],
      ['es', '/es/scholarships/hub/easy-apply', true],
      ['fr', '/fr/scholarships/hub/easy-apply', false]
    ]
  );
});

test('language switcher covers /subscription cluster', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/es/subscription'
  });
  assert.deepEqual(
    items.map((item) => [item.locale, item.href, item.current]),
    [
      ['en', '/subscription', false],
      ['es', '/es/subscription', true],
      ['fr', '/fr/subscription', false]
    ]
  );
});

test('language switcher on /es/compare/universities uses pathname locale (not stale SSR)', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/es/compare/universities',
    currentLocale: 'en'
  });
  assert.deepEqual(
    items.map((item) => [item.locale, item.href, item.current]),
    [
      ['en', '/compare/universities', false],
      ['es', '/es/compare/universities', true],
      ['fr', '/fr/compare/universities', false]
    ]
  );
});

test('language switcher on /compare uses English as active even if currentLocale is es', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/compare',
    currentLocale: 'es'
  });
  assert.equal(items.find((i) => i.locale === 'en')?.current, true);
  assert.equal(items.find((i) => i.locale === 'es')?.current, false);
});

test('language switcher on /fr/scholarships/hub/international-friendly links to EN and ES equivalents', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/fr/scholarships/hub/international-friendly'
  });
  assert.deepEqual(
    items.map((item) => [item.locale, item.href, item.current]),
    [
      ['en', '/scholarships/hub/international-friendly', false],
      ['es', '/es/scholarships/hub/international-friendly', false],
      ['fr', '/fr/scholarships/hub/international-friendly', true]
    ]
  );
});
