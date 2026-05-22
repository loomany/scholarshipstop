import assert from 'node:assert/strict';
import test from 'node:test';

import { buildProviderPilotSeedRows } from '@/lib/i18n/providerPilot/providerPilotTranslationsData';
import { PROVIDER_PILOT_SLUGS } from '@/lib/i18n/providerPilot/providerPilotSlugs';

test('buildProviderPilotSeedRows produces exactly 6 published rows', () => {
  const map = new Map(
    PROVIDER_PILOT_SLUGS.map((slug, i) => [
      slug,
      { id: `00000000-0000-4000-8000-00000000000${i}`, updated_at: null }
    ])
  );
  const rows = buildProviderPilotSeedRows(map);
  assert.equal(rows.length, 6);
  assert.equal(rows.filter((r) => r.locale === 'es').length, 3);
  assert.equal(rows.filter((r) => r.locale === 'fr').length, 3);
  assert.ok(rows.every((r) => r.status === 'published' && r.quality_score >= 85));
});
