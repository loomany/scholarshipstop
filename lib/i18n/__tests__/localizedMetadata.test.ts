import assert from 'node:assert/strict';
import test from 'node:test';

import { buildLocalizedPilotMetadata } from '@/lib/i18n/localizedMetadata';
import { getLocalizedPilotPage } from '@/lib/i18n/staticTranslations';

test('localized metadata uses self canonical and en/es/fr hreflang only', () => {
  const page = getLocalizedPilotPage('es', '/scholarships');
  assert.ok(page);
  const metadata = buildLocalizedPilotMetadata({ page });

  assert.equal(metadata.alternates?.canonical, 'https://scholarshiptop.com/es/scholarships');
  assert.deepEqual(metadata.alternates?.languages, {
    en: 'https://scholarshiptop.com/scholarships',
    es: 'https://scholarshiptop.com/es/scholarships',
    fr: 'https://scholarshiptop.com/fr/scholarships',
    'x-default': 'https://scholarshiptop.com/scholarships'
  });
  assert.equal('de' in (metadata.alternates?.languages ?? {}), false);
});

test('localized query pages keep self canonical but noindex follow', () => {
  const page = getLocalizedPilotPage('fr', '/essays');
  assert.ok(page);
  const metadata = buildLocalizedPilotMetadata({
    page,
    searchParams: { page: '2' }
  });

  assert.equal(metadata.alternates?.canonical, 'https://scholarshiptop.com/fr/essays');
  assert.deepEqual(metadata.robots, { index: false, follow: true });
});

test('localized article metadata is localized to the current locale', () => {
  const page = getLocalizedPilotPage('fr', '/compare/scholarship-vs-grant');
  assert.ok(page);
  const metadata = buildLocalizedPilotMetadata({ page });
  assert.equal(metadata.openGraph?.locale, 'fr_FR');
  assert.equal(metadata.openGraph?.url, 'https://scholarshiptop.com/fr/compare/scholarship-vs-grant');
});
