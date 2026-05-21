import assert from 'node:assert/strict';
import test from 'node:test';

import { buildStage2EnglishPilotAlternates } from '@/lib/i18n/englishAlternates';

test('English pilot pages include bidirectional es/fr alternates', () => {
  const alternates = buildStage2EnglishPilotAlternates('/scholarships');

  assert.equal(alternates.canonical, 'https://scholarshiptop.com/scholarships');
  assert.deepEqual(alternates.languages, {
    en: 'https://scholarshiptop.com/scholarships',
    es: 'https://scholarshiptop.com/es/scholarships',
    fr: 'https://scholarshiptop.com/fr/scholarships',
    'x-default': 'https://scholarshiptop.com/scholarships'
  });
});

test('English alternates are limited to launched Stage 2 locales', () => {
  const alternates = buildStage2EnglishPilotAlternates('/essays/checklist');

  assert.equal(alternates.languages?.en, 'https://scholarshiptop.com/essays/checklist');
  assert.equal(alternates.languages?.es, 'https://scholarshiptop.com/es/essays/checklist');
  assert.equal(alternates.languages?.fr, 'https://scholarshiptop.com/fr/essays/checklist');
  assert.equal('de' in (alternates.languages ?? {}), false);
  assert.equal('pt' in (alternates.languages ?? {}), false);
  assert.equal('ar' in (alternates.languages ?? {}), false);
});

test('non-pilot English pages keep canonical-only alternates', () => {
  const alternates = buildStage2EnglishPilotAlternates('/subscription');

  assert.equal(alternates.canonical, 'https://scholarshiptop.com/subscription');
  assert.equal(alternates.languages, undefined);
});
