import assert from 'node:assert/strict';
import test from 'node:test';

import { buildLocalizedPilotMetadata } from '@/lib/i18n/localizedMetadata';
import { getLocalizedPilotPage } from '@/lib/i18n/staticTranslations';

test('static localized resource metadata has localized canonical and no English route prefix', () => {
  const page = getLocalizedPilotPage(
    'es',
    '/resources/how-to-find-scholarships'
  );
  assert.ok(page);

  const metadata = buildLocalizedPilotMetadata({ page });
  const alternates = metadata.alternates as {
    canonical?: string;
    languages?: Record<string, string>;
  };

  assert.equal(metadata.title, page.title);
  assert.equal(metadata.description, page.metaDescription);
  assert.equal(
    alternates.canonical,
    'https://scholarshiptop.com/es/resources/how-to-find-scholarships'
  );
  assert.equal(
    alternates.languages?.['x-default'],
    'https://scholarshiptop.com/resources/how-to-find-scholarships'
  );
  assert.equal(
    Object.values(alternates.languages ?? {}).some((url) => url.includes('/en/')),
    false
  );
});

test('static localized resource query views are noindex/follow', () => {
  const page = getLocalizedPilotPage(
    'fr',
    '/resources/how-to-find-scholarships'
  );
  assert.ok(page);

  const metadata = buildLocalizedPilotMetadata({
    page,
    searchParams: { ref: 'newsletter' }
  });

  assert.deepEqual(metadata.robots, { index: false, follow: true });
});
