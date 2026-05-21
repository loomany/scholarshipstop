import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLocaleSitemapSlug,
  buildLocalizedSitemapEntry,
  shouldIncludeLocalizedUrl
} from '@/lib/i18n/localizedSitemaps';
import { listLocalizedPilotPages } from '@/lib/i18n/staticTranslations';

const publishedCandidate = {
  locale: 'es' as const,
  canonicalPath: '/essays/checklist',
  sourceIndexable: true,
  translationStatus: 'published' as const,
  qualityScore: 92,
  hasLocalizedTitle: true,
  hasLocalizedH1: true,
  hasLocalizedBody: true,
  hasMixedLanguageRisk: false
};

test('published localized pages can be included in locale sitemaps', () => {
  assert.equal(shouldIncludeLocalizedUrl(publishedCandidate), true);
  assert.deepEqual(buildLocalizedSitemapEntry(publishedCandidate), {
    url: 'https://scholarshiptop.com/es/essays/checklist'
  });
});

test('query/filter/private localized URLs are excluded', () => {
  assert.equal(
    shouldIncludeLocalizedUrl({
      ...publishedCandidate,
      canonicalPath: '/essays?page=2'
    }),
    false
  );
  assert.equal(
    shouldIncludeLocalizedUrl({
      ...publishedCandidate,
      hasQueryParams: true
    }),
    false
  );
  assert.equal(
    shouldIncludeLocalizedUrl({
      ...publishedCandidate,
      isFilterOrSearch: true
    }),
    false
  );
  assert.equal(
    shouldIncludeLocalizedUrl({
      ...publishedCandidate,
      isPrivate: true
    }),
    false
  );
});

test('partial, stale, and source-noindex translations are excluded', () => {
  assert.equal(
    shouldIncludeLocalizedUrl({
      ...publishedCandidate,
      translationStatus: 'review_required'
    }),
    false
  );
  assert.equal(
    shouldIncludeLocalizedUrl({
      ...publishedCandidate,
      translationStatus: 'stale'
    }),
    false
  );
  assert.equal(
    shouldIncludeLocalizedUrl({
      ...publishedCandidate,
      sourceIndexable: false
    }),
    false
  );
});

test('locale sitemap slugs preserve English root and prefix non-English locale buckets', () => {
  assert.equal(buildLocaleSitemapSlug('en', 'core'), 'core');
  assert.equal(buildLocaleSitemapSlug('es', 'core'), 'locale-es-core');
  assert.equal(
    buildLocaleSitemapSlug('fr', 'scholarships', 0),
    'locale-fr-scholarships-0'
  );
});

test('Stage 2 localized sitemap buckets include only published es/fr pilot pages', () => {
  const esEssays = listLocalizedPilotPages({ locale: 'es', bucket: 'essays' });
  const frCompare = listLocalizedPilotPages({ locale: 'fr', bucket: 'compare' });

  assert.equal(esEssays.length, 12);
  assert.equal(frCompare.length, 5);
  assert.equal(
    esEssays.some((page) => page.canonicalPath.startsWith('/scholarships/')),
    false
  );
  assert.equal(
    listLocalizedPilotPages().some((page) => String(page.locale) === 'de'),
    false
  );
});
