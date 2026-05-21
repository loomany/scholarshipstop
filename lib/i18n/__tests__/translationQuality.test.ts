import assert from 'node:assert/strict';
import test from 'node:test';

import { getTranslatedPageSeoDecision } from '@/lib/i18n/translationPolicy';

const base = {
  sourceIndexable: true,
  translationStatus: 'published' as const,
  qualityScore: 90,
  hasLocalizedTitle: true,
  hasLocalizedH1: true,
  hasLocalizedBody: true,
  hasMixedLanguageRisk: false
};

test('published high-quality translations can become indexable', () => {
  const result = getTranslatedPageSeoDecision(base);

  assert.equal(result.indexable, true);
  assert.equal(result.robots, 'index, follow');
  assert.equal(result.includeInSitemap, true);
  assert.equal(result.includeInHreflang, true);
});

test('draft translations stay noindex and out of sitemap/hreflang', () => {
  const result = getTranslatedPageSeoDecision({
    ...base,
    translationStatus: 'draft_machine'
  });

  assert.equal(result.indexable, false);
  assert.equal(result.robots, 'noindex, follow');
  assert.equal(result.includeInSitemap, false);
  assert.equal(result.includeInHreflang, false);
});

test('published translations below quality threshold stay noindex', () => {
  const result = getTranslatedPageSeoDecision({
    ...base,
    qualityScore: 84
  });

  assert.equal(result.indexable, false);
  assert.equal(result.robots, 'noindex, follow');
});

test('partial or mixed-language translations stay noindex', () => {
  const missingBody = getTranslatedPageSeoDecision({
    ...base,
    hasLocalizedBody: false
  });
  const mixedLanguage = getTranslatedPageSeoDecision({
    ...base,
    hasMixedLanguageRisk: true
  });

  assert.equal(missingBody.indexable, false);
  assert.equal(mixedLanguage.indexable, false);
});

test('translations inherit noindex from a non-indexable English source', () => {
  const result = getTranslatedPageSeoDecision({
    ...base,
    sourceIndexable: false
  });

  assert.equal(result.indexable, false);
  assert.equal(result.includeInSitemap, false);
});

