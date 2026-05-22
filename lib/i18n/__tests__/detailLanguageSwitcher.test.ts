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

test('scholarship detail EN shows English-only switcher', () => {
  const items = getDetailLanguageSwitcherItems(
    '/scholarships/climate-stripes-scholarship-14487'
  );
  assert.equal(items.length, 1);
  assert.equal(items[0]?.locale, 'en');
  assert.equal(items[0]?.current, true);
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
