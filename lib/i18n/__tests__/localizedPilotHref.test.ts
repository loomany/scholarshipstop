import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getStage2LanguageSwitcherItems,
  hrefForLocalizedUi,
  localizedHubCatalogBrowserPath,
  localizedPilotHref,
  localizedScholarshipHubTabHref
} from '@/lib/i18n/localizedHref';

test('localizedPilotHref keeps English root unprefixed', () => {
  assert.equal(localizedPilotHref('en', '/scholarships'), '/scholarships');
  assert.equal(localizedPilotHref('en', '/'), '/');
});

test('localizedPilotHref prefixes Stage 2 pilot paths for es and fr', () => {
  assert.equal(localizedPilotHref('es', '/scholarships'), '/es/scholarships');
  assert.equal(
    localizedPilotHref('fr', '/essays/checklist'),
    '/fr/essays/checklist'
  );
  assert.equal(localizedPilotHref('es', '/terms'), '/es/terms');
});

test('localizedHubCatalogBrowserPath prefixes hub browser URLs for es and fr', () => {
  assert.equal(
    localizedHubCatalogBrowserPath('es', '/scholarships/hub/matches'),
    '/es/scholarships/hub/matches'
  );
  assert.equal(
    localizedHubCatalogBrowserPath('fr', '/scholarships'),
    '/fr/scholarships'
  );
  assert.equal(
    localizedHubCatalogBrowserPath('en', '/scholarships/hub/matches'),
    '/scholarships/hub/matches'
  );
});

test('localizedScholarshipHubTabHref prefixes hub tabs for es and fr', () => {
  assert.equal(
    localizedScholarshipHubTabHref('es', 'easy-apply'),
    '/es/scholarships/hub/easy-apply'
  );
  assert.equal(
    localizedScholarshipHubTabHref('fr', 'international-friendly'),
    '/fr/scholarships/hub/international-friendly'
  );
  assert.equal(
    localizedScholarshipHubTabHref('en', 'matches'),
    '/scholarships/hub/matches'
  );
});

test('localizedPilotHref returns null for non-pilot paths on es and fr', () => {
  assert.equal(localizedPilotHref('es', '/scholarships/hub/easy-apply'), null);
  assert.equal(localizedPilotHref('fr', '/essay'), null);
  assert.equal(localizedPilotHref('es', '/subscription'), null);
});

test('hrefForLocalizedUi matches localizedPilotHref', () => {
  assert.equal(
    hrefForLocalizedUi('es', '/providers'),
    localizedPilotHref('es', '/providers')
  );
});

test('language switcher never emits /en URLs', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/es/essays/checklist',
    currentLocale: 'es'
  });
  assert.ok(items.every((item) => !item.href.includes('/en/')));
  assert.ok(items.every((item) => !item.href.startsWith('/en')));
});

test('language switcher links stay on same canonical path across locales', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/fr/compare/scholarship-vs-grant'
  });
  assert.deepEqual(
    items.map((item) => item.href),
    [
      '/compare/scholarship-vs-grant',
      '/es/compare/scholarship-vs-grant',
      '/fr/compare/scholarship-vs-grant'
    ]
  );
});
