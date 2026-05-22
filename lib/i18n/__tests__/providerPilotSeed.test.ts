import assert from 'node:assert/strict';
import test from 'node:test';

import { buildProviderPilotSeedRows } from '@/lib/i18n/providerPilot/providerPilotTranslationsData';
import {
  PROVIDER_PILOT_SLUGS,
  PROVIDER_PILOT_SLUGS_BATCH_1,
  PROVIDER_PILOT_SLUGS_BATCH_2
} from '@/lib/i18n/providerPilot/providerPilotSlugs';

test('buildProviderPilotSeedRows batch 1 produces 6 published rows', () => {
  const map = new Map(
    PROVIDER_PILOT_SLUGS_BATCH_1.map((slug, i) => [
      slug,
      { id: `00000000-0000-4000-8000-00000000000${i}`, updated_at: null }
    ])
  );
  const rows = buildProviderPilotSeedRows(map, PROVIDER_PILOT_SLUGS_BATCH_1);
  assert.equal(rows.length, 6);
  assert.ok(rows.every((r) => r.status === 'published' && r.quality_score >= 85));
});

test('buildProviderPilotSeedRows all slugs produces 10 published rows', () => {
  const map = new Map(
    PROVIDER_PILOT_SLUGS.map((slug, i) => [
      slug,
      { id: `00000000-0000-4000-8000-0000000000${String(i).padStart(2, '0')}`, updated_at: null }
    ])
  );
  const rows = buildProviderPilotSeedRows(map);
  assert.equal(rows.length, 10);
  assert.equal(rows.filter((r) => PROVIDER_PILOT_SLUGS_BATCH_2.includes(r.source_slug as never)).length, 4);
  assert.ok(rows.every((r) => r.status === 'published' && r.quality_score >= 85));
});
