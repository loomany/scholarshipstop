import assert from 'node:assert/strict';
import test from 'node:test';

import {
  METADATA_NOT_FOUND,
  resolveStage2PilotLocaleFromParams
} from '@/lib/i18n/metadataRouteParams';

test('resolveStage2PilotLocaleFromParams returns null for missing params', () => {
  assert.equal(resolveStage2PilotLocaleFromParams(undefined), null);
  assert.equal(resolveStage2PilotLocaleFromParams({}), null);
  assert.equal(resolveStage2PilotLocaleFromParams({ locale: 'en' }), null);
});

test('resolveStage2PilotLocaleFromParams accepts es and fr', () => {
  assert.equal(resolveStage2PilotLocaleFromParams({ locale: 'es' }), 'es');
  assert.equal(resolveStage2PilotLocaleFromParams({ locale: 'fr' }), 'fr');
});

test('METADATA_NOT_FOUND is noindex', () => {
  assert.deepEqual(METADATA_NOT_FOUND.robots, { index: false, follow: false });
});
