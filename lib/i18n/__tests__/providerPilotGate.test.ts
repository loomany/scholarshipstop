import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLocalizedProviderPageCopy,
  isPublishedProviderTranslation
} from '@/lib/i18n/providerPilot/providerProfileTranslationGate';
import type { ContentTranslationRow } from '@/lib/i18n/contentTranslationsTypes';

function sampleRow(
  overrides: Partial<ContentTranslationRow> = {}
): ContentTranslationRow {
  return {
    id: '00000000-0000-4000-8000-000000000099',
    source_type: 'provider_profile',
    source_id: '00000000-0000-4000-8000-000000000010',
    locale: 'es',
    status: 'published',
    quality_score: 90,
    translated_title: 'Perfil de Loyola',
    translated_meta_title: 'Loyola | Proveedor',
    translated_meta_description: 'Descripción meta',
    translated_body: 'Párrafo uno.\n\nPárrafo dos.',
    translated_faq_json: [{ question: 'Q', answer: 'A' }],
    translated_slug: null,
    translated_summary: null,
    translated_extra_json: null,
    source_hash: null,
    source_updated_at: null,
    translated_schema_json: null,
    machine_model: null,
    translated_by: null,
    reviewed_by: null,
    reviewer_notes: null,
    published_at: null,
    stale_at: null,
    blocked_reason: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides
  };
}

test('isPublishedProviderTranslation requires published, score, title, body', () => {
  assert.equal(isPublishedProviderTranslation(sampleRow()), true);
  assert.equal(isPublishedProviderTranslation(sampleRow({ status: 'review_required' })), false);
  assert.equal(isPublishedProviderTranslation(sampleRow({ quality_score: 80 })), false);
  assert.equal(isPublishedProviderTranslation(sampleRow({ translated_body: '' })), false);
});

test('buildLocalizedProviderPageCopy maps FAQ and paragraphs', () => {
  const copy = buildLocalizedProviderPageCopy(sampleRow(), 'Loyola University Chicago');
  assert.equal(copy.pageTitle, 'Perfil de Loyola');
  assert.equal(copy.aboutParagraphs.length, 2);
  assert.equal(copy.faqItems.length, 1);
  assert.equal(copy.faqItems[0]?.question, 'Q');
});
