import assert from 'node:assert/strict';
import test from 'node:test';

import { essayHubArticlePath } from '@/lib/essays/essayHubSection';
import type { ContentPostRow } from '@/lib/content-hub/contentPostListTypes';
import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import { getEnglishFallbackNotice } from '@/lib/i18n/englishFallbackNotice';
import { getNotFoundUiCopy } from '@/lib/i18n/notFoundUiCopy';
import { buildEnglishFallbackPageMetadata } from '@/lib/i18n/localizedContentFallbackMetadata';
import { getDetailLanguageSwitcherItems } from '@/lib/i18n/detailLanguageSwitcher';
import {
  localizedEssayGuideHref,
  localizedResourcePilotArticleHref
} from '@/lib/i18n/localizedHref';
import { buildEnglishFallbackEssayPageCopy } from '@/lib/i18n/essayPilot/essayDetailTranslationGate';
import { buildEnglishFallbackResourcePageCopy } from '@/lib/i18n/resourcePilot/resourcePageCopy';

test('not found UI copy for es and fr', () => {
  assert.equal(getNotFoundUiCopy('es').title, 'Página no encontrada');
  assert.match(getNotFoundUiCopy('es').body, /no existe o se ha movido/);
  assert.equal(getNotFoundUiCopy('es').home, 'Volver al inicio');
  assert.equal(getNotFoundUiCopy('fr').title, 'Page introuvable');
  assert.match(getNotFoundUiCopy('fr').body, /n’existe pas ou a été déplacée/);
  assert.equal(getNotFoundUiCopy('fr').home, 'Retour à l’accueil');
});

test('english fallback notice copy for es and fr', () => {
  assert.match(getEnglishFallbackNotice('es'), /inglés/i);
  assert.match(getEnglishFallbackNotice('fr'), /anglais/i);
});

test('english fallback metadata is noindex with english canonical only', () => {
  const slug = 'scholarship-eligibility-requirements-usa';
  const meta = buildEnglishFallbackPageMetadata({
    englishCanonicalPath: resourcesArticlePath(slug),
    title: 'Scholarship Eligibility Requirements in the USA Explained',
    description: 'Guide',
    openGraphLocale: 'es_ES'
  });
  assert.deepEqual(meta.robots, { index: false, follow: true });
  assert.equal(
    meta.alternates?.canonical,
    'https://scholarshiptop.com/resources/scholarship-eligibility-requirements-usa'
  );
  assert.equal(meta.alternates?.languages, undefined);
});

test('english fallback resource copy keeps english body and localized chrome labels', () => {
  const copy = buildEnglishFallbackResourcePageCopy(
    {
      id: 'x',
      slug: 'scholarship-eligibility-requirements-usa',
      title: 'Scholarship Eligibility Requirements in the USA Explained',
      meta_title: 'Scholarship Eligibility Requirements in the USA Explained',
      meta_description: 'EN description',
      body_html: '<p>English body</p>',
      faq: null,
      status: 'published',
      published_at: null,
      updated_at: null,
      cover_image_url: null
    } as ContentPostRow,
    'es'
  );
  assert.equal(copy.title, 'Scholarship Eligibility Requirements in the USA Explained');
  assert.equal(copy.bodyHtml, '<p>English body</p>');
  assert.equal(copy.backLabel, '← Volver a recursos de becas');
});

test('english fallback essay copy keeps english headline', () => {
  const copy = buildEnglishFallbackEssayPageCopy(
    {
      id: 'e1',
      slug: 'sample-essay-slug',
      title: 'English Essay Title',
      content_html: '<p>Essay body</p>',
      hero_image_url: null,
      hero_is_real: false,
      sources: null,
      faq: null,
      meta_description: 'Essay intro',
      hub_category_slug: null,
      hub_category_label: null,
      manual_topic: null,
      is_published: true,
      created_at: null,
      updated_at: null
    },
    'fr'
  );
  assert.equal(copy.headline, 'English Essay Title');
  assert.equal(copy.bodyHtml, '<p>Essay body</p>');
});

test('localized hub cards use locale-prefixed detail paths', () => {
  const slug = 'scholarship-eligibility-requirements-usa';
  assert.equal(
    localizedResourcePilotArticleHref('es', slug),
    '/es/resources/scholarship-eligibility-requirements-usa'
  );
  assert.equal(
    localizedEssayGuideHref('fr', 'some-english-essay'),
    '/fr/essays/some-english-essay'
  );
  assert.equal(
    localizedResourcePilotArticleHref('en', slug),
    resourcesArticlePath(slug)
  );
  assert.equal(localizedEssayGuideHref('en', 'x'), essayHubArticlePath('x'));
});

test('language switcher for resource detail never uses /en', () => {
  const items = getDetailLanguageSwitcherItems(
    '/es/resources/scholarship-eligibility-requirements-usa'
  );
  assert.equal(items.length, 3);
  assert.ok(
    items.some(
      (i) =>
        i.locale === 'en' &&
        i.href === '/resources/scholarship-eligibility-requirements-usa'
    )
  );
  assert.ok(
    items.some(
      (i) =>
        i.locale === 'es' &&
        i.href === '/es/resources/scholarship-eligibility-requirements-usa'
    )
  );
  assert.ok(!items.some((i) => i.href.includes('/en/')));
});

test('language switcher for essay detail offers localized fallback paths', () => {
  const slug = 'how-to-write-about-the-gap-between-expectation-and-reality-of-studying-in-america';
  const items = getDetailLanguageSwitcherItems(`/fr/essays/${slug}`);
  assert.equal(items.length, 3);
  assert.ok(items.some((i) => i.locale === 'fr' && i.href === `/fr/essays/${slug}`));
  assert.ok(items.some((i) => i.locale === 'en' && i.href === `/essays/${slug}`));
});
