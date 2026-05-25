import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getDetailLanguageSwitcherItems,
  scholarshipDetailSlugFromPath
} from '@/lib/i18n/detailLanguageSwitcher';
import { getStage2LanguageSwitcherItems } from '@/lib/i18n/localizedHref';

test('scholarship detail slug excludes category and hub', () => {
  assert.equal(scholarshipDetailSlugFromPath('/scholarships/stem'), null);
  assert.equal(
    scholarshipDetailSlugFromPath('/scholarships/climate-stripes-scholarship-14487'),
    'climate-stripes-scholarship-14487'
  );
});

test('scholarship detail pilot shows en/es/fr switcher', () => {
  const items = getDetailLanguageSwitcherItems(
    '/scholarships/climate-stripes-scholarship-14487'
  );
  assert.equal(items.length, 3);
  assert.equal(items[0]?.locale, 'en');
  assert.equal(items[0]?.current, true);
});

test('scholarship detail offers en/es/fr switcher links (route gate uses DB translation)', () => {
  const items = getDetailLanguageSwitcherItems('/scholarships/some-other-slug-999');
  assert.equal(items.length, 3);
  assert.ok(items.some((i) => i.locale === 'es'));
  assert.ok(items.some((i) => i.locale === 'fr'));
});

test('provider pilot shows en/es/fr cluster', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/providers/loyola-university-chicago'
  });
  assert.equal(items.length, 3);
  assert.ok(items.some((i) => i.locale === 'es'));
  assert.ok(items.some((i) => i.locale === 'fr'));
  assert.ok(!items.some((i) => i.href.includes('/en')));
});

test('navbar switcher delegates to detail cluster', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/es/providers/harvard-university'
  });
  assert.equal(items.length, 3);
  assert.equal(items.find((i) => i.current)?.locale, 'es');
});

test('compare state detail offers en/es/fr for any published slug', () => {
  const items = getDetailLanguageSwitcherItems('/compare/states/nebraska-vs-utah');
  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((i) => [i.locale, i.href, i.current]),
    [
      ['en', '/compare/states/nebraska-vs-utah', true],
      ['es', '/es/compare/states/nebraska-vs-utah', false],
      ['fr', '/fr/compare/states/nebraska-vs-utah', false]
    ]
  );
});

test('compare university detail offers en/es/fr for localized path', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname:
      '/es/compare/universities/florida-gateway-college-vs-waubonsee-community-college'
  });
  assert.equal(items.length, 3);
  assert.equal(items.find((i) => i.current)?.locale, 'es');
  assert.ok(
    items.some(
      (i) =>
        i.locale === 'en' &&
        i.href ===
          '/compare/universities/florida-gateway-college-vs-waubonsee-community-college'
    )
  );
});

test('cms resource article offers en/es/fr switcher (non-pilot slug)', () => {
  const items = getDetailLanguageSwitcherItems(
    '/resources/can-chatgpt-help-find-scholarships'
  );
  assert.equal(items.length, 3);
  assert.ok(items.some((i) => i.locale === 'es' && i.href.includes('/es/resources/')));
  assert.ok(items.some((i) => i.locale === 'fr' && i.href.includes('/fr/resources/')));
});
