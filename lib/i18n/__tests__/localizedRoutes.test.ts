import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getStage2LocaleFromPathname,
  isStage2PilotLocale,
  localizedHrefForPilotPath,
  pilotCanonicalPathFromSegments,
  stage2CanonicalPathFromPathname
} from '@/lib/i18n/pilotRoutes';
import {
  getLocalizedPilotPage,
  getLocalizedPilotPageBySegments,
  listLocalizedPilotPages
} from '@/lib/i18n/staticTranslations';

test('Stage 2 exposes only Spanish and French locale prefixes', () => {
  assert.equal(isStage2PilotLocale('es'), true);
  assert.equal(isStage2PilotLocale('fr'), true);
  assert.equal(isStage2PilotLocale('en'), false);
  assert.equal(isStage2PilotLocale('de'), false);
});

test('localized pilot paths resolve to published entries', () => {
  assert.equal(localizedHrefForPilotPath('es', '/scholarships'), '/es/scholarships');
  assert.equal(
    localizedHrefForPilotPath('fr', '/essays/checklist'),
    '/fr/essays/checklist'
  );
  assert.equal(localizedHrefForPilotPath('es', '/scholarships/random'), null);
  assert.equal(getLocalizedPilotPage('en', '/'), null);
});

test('catch-all route segments map to canonical pilot paths', () => {
  assert.equal(pilotCanonicalPathFromSegments(undefined), '/');
  assert.equal(
    pilotCanonicalPathFromSegments(['compare', 'scholarship-vs-grant']),
    '/compare/scholarship-vs-grant'
  );
  assert.equal(
    getLocalizedPilotPageBySegments('fr', ['essays', 'examples'])?.h1,
    'Exemples de rédaction pour bourses'
  );
});

test('localized pathnames strip back to canonical English paths', () => {
  assert.equal(getStage2LocaleFromPathname('/es/providers'), 'es');
  assert.equal(stage2CanonicalPathFromPathname('/fr/compare'), '/compare');
  assert.equal(stage2CanonicalPathFromPathname('/scholarships'), '/scholarships');
});

test('pilot scale stays controlled at 106 translated URLs', () => {
  assert.equal(listLocalizedPilotPages().length, 106);
  assert.equal(listLocalizedPilotPages({ locale: 'es' }).length, 53);
  assert.equal(listLocalizedPilotPages({ locale: 'fr' }).length, 53);
});
