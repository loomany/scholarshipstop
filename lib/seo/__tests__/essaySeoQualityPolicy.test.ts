import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getEssaySeoQualityPolicy,
  MIN_LOCALIZED_ESSAY_VISIBLE_WORDS
} from '@/lib/seo/essaySeoQualityPolicy';

test('essay quality keeps substantial public English guides indexable', () => {
  const result = getEssaySeoQualityPolicy({
    stablePublicRoute: true,
    hasQueryParams: false,
    hasTitle: true,
    hasH1: true,
    hasBody: true,
    visibleWordCount: 650
  });

  assert.equal(result.indexable, true);
  assert.equal(result.includeInSitemap, true);
});

test('essay quality noindexes thin localized guides', () => {
  const result = getEssaySeoQualityPolicy({
    stablePublicRoute: true,
    hasQueryParams: false,
    hasTitle: true,
    hasH1: true,
    hasBody: true,
    localized: true,
    hasLocalizedTitle: true,
    hasLocalizedH1: true,
    hasLocalizedBody: true,
    visibleWordCount: 286
  });

  assert.equal(result.indexable, false);
  assert.equal(result.includeInSitemap, false);
  assert.equal(
    result.reasons.includes(
      `Visible content is below ${MIN_LOCALIZED_ESSAY_VISIBLE_WORDS} useful words.`
    ),
    true
  );
});

test('essay quality rejects private or placeholder pages', () => {
  const result = getEssaySeoQualityPolicy({
    stablePublicRoute: true,
    hasQueryParams: false,
    isPrivate: true,
    hasTitle: true,
    hasH1: true,
    hasBody: true,
    visibleWordCount: 900,
    hasRawPlaceholder: true
  });

  assert.equal(result.indexable, false);
  assert.equal(result.includeInSitemap, false);
  assert.equal(result.reasons.includes('Essay page is private or user-specific.'), true);
  assert.equal(result.reasons.includes('Raw placeholder text is present.'), true);
});
