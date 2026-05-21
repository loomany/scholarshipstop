import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCategoryPilotSeedRows,
  CATEGORY_PILOT_SOURCE_IDS,
  getCategoryPilotContent
} from '@/lib/i18n/categoryPilot/categoryPilotTranslationsData';
import { buildCategorySourceHash } from '@/lib/i18n/categoryPilot/buildCategorySourceHash';
import {
  buildLocalizedCategoryPageCopy,
  resolveCategorySlugParam
} from '@/lib/i18n/categoryPilot/resolveLocalizedCategoryPage';
import {
  canAddTranslatedDbHreflang,
  canIncludeTranslatedDbPageInSitemap
} from '@/lib/i18n/contentTranslationsDbPolicy';
import { localizedCategorySeoHref } from '@/lib/i18n/localizedHref';
import { getStage2LanguageSwitcherItems } from '@/lib/i18n/localizedHref';
import type { ContentTranslationRow } from '@/lib/i18n/contentTranslationsTypes';

function mockPublishedRow(
  overrides: Partial<ContentTranslationRow> = {}
): ContentTranslationRow {
  const content = getCategoryPilotContent('stem', 'es');
  assert.ok(content);
  return {
    id: '00000000-0000-4000-8000-000000000099',
    source_type: 'scholarship_category',
    source_id: 'stem',
    locale: 'es',
    source_hash: buildCategorySourceHash('stem'),
    source_updated_at: null,
    status: 'published',
    translated_slug: null,
    translated_title: content.translated_title,
    translated_meta_title: content.translated_meta_title,
    translated_meta_description: content.translated_meta_description,
    translated_summary: content.translated_summary,
    translated_body: content.translated_body,
    translated_faq_json: content.translated_faq_json,
    translated_schema_json: null,
    translated_extra_json: content.translated_extra_json,
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

test('pilot includes exactly 11 promoted category source IDs', () => {
  assert.equal(CATEGORY_PILOT_SOURCE_IDS.length, 11);
  assert.deepEqual(
    [...CATEGORY_PILOT_SOURCE_IDS].sort(),
    [
      'arts',
      'biology',
      'community',
      'disability',
      'education',
      'humanities',
      'law',
      'medical',
      'music',
      'safety',
      'stem'
    ].sort()
  );
  assert.equal(CATEGORY_PILOT_SOURCE_IDS.includes('hobbies' as never), false);
});

test('seed builder produces 22 published rows', () => {
  const rows = buildCategoryPilotSeedRows();
  assert.equal(rows.length, 22);
  assert.equal(rows.every((r) => r.status === 'published'), true);
  assert.equal(rows.every((r) => (r.quality_score ?? 0) >= 85), true);
});

test('published category translation builds localized page copy', () => {
  const row = mockPublishedRow();
  const copy = buildLocalizedCategoryPageCopy(row, 'stem', 'stem', 'es');
  assert.match(copy.pageTitle, /STEM|Becas/i);
  assert.ok(copy.introParagraph.length > 40);
  assert.ok(copy.postListing.faqItems.length >= 3);
});

test('draft category translation is not sitemap or hreflang eligible', () => {
  const input = {
    translation: mockPublishedRow({ status: 'draft_machine' }),
    englishIndexable: true
  };
  assert.equal(canIncludeTranslatedDbPageInSitemap(input), false);
  assert.equal(canAddTranslatedDbHreflang(input), false);
});

test('published category translation is sitemap eligible when English indexable', () => {
  const input = {
    translation: mockPublishedRow(),
    englishIndexable: true,
    hasLocalizedTitle: true,
    hasLocalizedH1: true,
    hasLocalizedBody: true
  };
  assert.equal(canIncludeTranslatedDbPageInSitemap(input), true);
  assert.equal(canAddTranslatedDbHreflang(input), true);
});

test('resolveCategorySlugParam recognizes promoted categories', () => {
  const stem = resolveCategorySlugParam('stem');
  assert.equal(stem.promoted, true);
  assert.equal(stem.canonicalSlug, 'stem');
  const misc = resolveCategorySlugParam('hobbies');
  assert.equal(misc.promoted, false);
});

test('localized category hrefs use es/fr prefixes without /en', () => {
  assert.equal(localizedCategorySeoHref('en', 'music'), '/scholarships/category/music');
  assert.equal(
    localizedCategorySeoHref('es', 'music'),
    '/es/scholarships/category/music'
  );
  assert.equal(
    localizedCategorySeoHref('fr', 'safety'),
    '/fr/scholarships/category/safety'
  );
});

test('language switcher exposes EN/ES/FR for promoted category paths', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/es/scholarships/category/stem',
    currentLocale: 'es'
  });
  assert.equal(items.length, 3);
  assert.equal(
    items.some((i) => i.locale === 'en' && i.href === '/scholarships/category/stem'),
    true
  );
  assert.equal(
    items.some((i) => i.locale === 'fr' && i.href === '/fr/scholarships/category/stem'),
    true
  );
  assert.equal(items.some((i) => i.href.includes('/en/')), false);
});

test('language switcher hidden for non-promoted category slug', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/scholarships/category/hobbies'
  });
  assert.equal(items.length, 0);
});
