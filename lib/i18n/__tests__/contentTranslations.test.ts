import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canAddTranslatedDbHreflang,
  canIncludeTranslatedDbPageInSitemap,
  getTranslatedDbRobots,
  translatedDbPageIsPubliclyMissing
} from '@/lib/i18n/contentTranslationsDbPolicy';
import {
  CONTENT_TRANSLATION_SOURCE_TYPES,
  type ContentTranslationRow
} from '@/lib/i18n/contentTranslationsTypes';
import {
  getTranslationSourceHash,
  getContentTranslationSeoDecision
} from '@/lib/i18n/contentTranslationsServer';
import {
  isContentTranslationSourceType,
  isPublishedTranslation,
  isSupportedTranslationLocale,
  shouldExposeTranslatedRoute,
  shouldIndexTranslatedContent
} from '@/lib/i18n/contentTranslationsTypes';

function sampleRow(
  overrides: Partial<ContentTranslationRow> = {}
): ContentTranslationRow {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    source_type: 'scholarship_detail',
    source_id: 'sch-1',
    locale: 'es',
    source_hash: 'abc',
    source_updated_at: null,
    status: 'published',
    translated_slug: null,
    translated_title: 'Beca de ejemplo',
    translated_meta_title: 'Meta ES',
    translated_meta_description: 'Descripción ES',
    translated_summary: 'Resumen',
    translated_body: '<p>Cuerpo</p>',
    translated_faq_json: null,
    translated_schema_json: null,
    translated_extra_json: null,
    quality_score: 90,
    machine_model: null,
    translated_by: null,
    reviewed_by: null,
    reviewer_notes: null,
    published_at: '2026-05-21T00:00:00.000Z',
    stale_at: null,
    blocked_reason: null,
    created_at: '2026-05-21T00:00:00.000Z',
    updated_at: '2026-05-21T00:00:00.000Z',
    ...overrides
  };
}

test('locale and source_type validation', () => {
  assert.equal(isSupportedTranslationLocale('es'), true);
  assert.equal(isSupportedTranslationLocale('fr'), true);
  assert.equal(isSupportedTranslationLocale('en'), false);
  assert.equal(isSupportedTranslationLocale('de'), false);
  assert.equal(isContentTranslationSourceType('scholarship_detail'), true);
  assert.equal(isContentTranslationSourceType('invalid'), false);
  assert.equal(CONTENT_TRANSLATION_SOURCE_TYPES.includes('university_hub'), true);
});

test('published-only exposure helpers', () => {
  assert.equal(isPublishedTranslation('published'), true);
  assert.equal(isPublishedTranslation('draft_machine'), false);
  assert.equal(isPublishedTranslation('stale'), false);
  assert.equal(shouldExposeTranslatedRoute(sampleRow()), true);
  assert.equal(shouldExposeTranslatedRoute(sampleRow({ status: 'reviewed' })), false);
  assert.equal(shouldExposeTranslatedRoute(null), false);
  assert.equal(translatedDbPageIsPubliclyMissing(null), true);
  assert.equal(translatedDbPageIsPubliclyMissing(sampleRow()), false);
});

test('missing translation must not be indexable or hreflang eligible', () => {
  const input = {
    translation: null,
    englishIndexable: true
  };
  assert.equal(shouldIndexTranslatedContent(input), false);
  assert.equal(canIncludeTranslatedDbPageInSitemap(input), false);
  assert.equal(canAddTranslatedDbHreflang(input), false);
  assert.equal(getTranslatedDbRobots(input), 'noindex, follow');
});

test('published translation with indexable English source', () => {
  const input = {
    translation: sampleRow(),
    englishIndexable: true
  };
  assert.equal(shouldIndexTranslatedContent(input), true);
  assert.equal(canIncludeTranslatedDbPageInSitemap(input), true);
  assert.equal(canAddTranslatedDbHreflang(input), true);
  assert.equal(getTranslatedDbRobots(input), 'index, follow');
});

test('published translation respects English noindex', () => {
  const input = {
    translation: sampleRow(),
    englishIndexable: false
  };
  assert.equal(shouldIndexTranslatedContent(input), false);
  assert.equal(getTranslatedDbRobots(input), 'noindex, follow');
});

test('draft and stale statuses never index', () => {
  for (const status of ['draft_machine', 'review_required', 'stale', 'blocked'] as const) {
    const input = {
      translation: sampleRow({ status }),
      englishIndexable: true
    };
    assert.equal(shouldIndexTranslatedContent(input), false);
    assert.equal(canIncludeTranslatedDbPageInSitemap(input), false);
  }
});

test('low quality_score blocks sitemap even when published', () => {
  const input = {
    translation: sampleRow({ quality_score: 50 }),
    englishIndexable: true
  };
  assert.equal(shouldIndexTranslatedContent(input), false);
});

test('getContentTranslationSeoDecision mirrors policy', () => {
  const decision = getContentTranslationSeoDecision({
    translation: sampleRow(),
    englishIndexable: true
  });
  assert.equal(decision.indexable, true);
  assert.equal(decision.includeInSitemap, true);
  assert.equal(decision.includeInHreflang, true);
  assert.equal(decision.robots, 'index, follow');
});

test('getTranslationSourceHash is stable for key order', () => {
  const a = getTranslationSourceHash({ title: 'A', amount: '$1,000' });
  const b = getTranslationSourceHash({ amount: '$1,000', title: 'A' });
  assert.equal(a, b);
  assert.notEqual(a, getTranslationSourceHash({ title: 'B', amount: '$1,000' }));
});
