import assert from 'node:assert/strict';
import test from 'node:test';

import { buildLocalizedAlternates } from '@/lib/i18n/alternates';

test('localized alternates include self, English root, and x-default', () => {
  const alternates = buildLocalizedAlternates({
    canonicalPath: '/scholarships',
    currentLocale: 'es',
    availableLocales: ['en', 'es', 'fr']
  });

  assert.equal(
    alternates.canonical,
    'https://scholarshiptop.com/es/scholarships'
  );
  assert.equal(alternates.languages.en, 'https://scholarshiptop.com/scholarships');
  assert.equal(
    alternates.languages.es,
    'https://scholarshiptop.com/es/scholarships'
  );
  assert.equal(
    alternates.languages.fr,
    'https://scholarshiptop.com/fr/scholarships'
  );
  assert.equal(
    alternates.languages['x-default'],
    'https://scholarshiptop.com/scholarships'
  );
});

test('missing translations are excluded from hreflang languages', () => {
  const alternates = buildLocalizedAlternates({
    canonicalPath: '/essays/checklist',
    currentLocale: 'en',
    availableLocales: ['en', 'es']
  });

  assert.equal(alternates.languages.en, 'https://scholarshiptop.com/essays/checklist');
  assert.equal(
    alternates.languages.es,
    'https://scholarshiptop.com/es/essays/checklist'
  );
  assert.equal('fr' in alternates.languages, false);
  assert.equal('de' in alternates.languages, false);
});

test('defaultUrl can point x-default to an explicit selector', () => {
  const alternates = buildLocalizedAlternates({
    canonicalPath: '/resources',
    currentLocale: 'fr',
    availableLocales: ['en', 'fr'],
    defaultUrl: 'https://scholarshiptop.com/language'
  });

  assert.equal(alternates.languages['x-default'], 'https://scholarshiptop.com/language');
});

