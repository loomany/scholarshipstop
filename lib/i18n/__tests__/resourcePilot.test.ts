import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildResourcePilotSeedRows,
  getResourcePilotContent
} from '@/lib/i18n/resourcePilot/resourcePilotTranslationsData';
import {
  RESOURCE_PILOT_SLUGS,
  isResourcePilotSlug
} from '@/lib/i18n/resourcePilot/resourcePilotSlugs';
import { sectionsToHtml } from '@/lib/i18n/resourcePilot/resourcePilotArticleBuilder';
import { getStage2LanguageSwitcherItems } from '@/lib/i18n/localizedHref';

test('resource pilot has exactly 25 curated slugs', () => {
  assert.equal(RESOURCE_PILOT_SLUGS.length, 25);
  assert.equal(isResourcePilotSlug('avoid-scholarship-scams-targeting-families'), true);
  assert.equal(isResourcePilotSlug('verify-scholarship-winners-usa-previous-years'), false);
});

test('pilot content builds HTML body and FAQ for each locale', () => {
  const slug = 'types-of-scholarships-usa-explained';
  const es = getResourcePilotContent(slug, 'es');
  const html = sectionsToHtml(es.sections);
  assert.ok(html.includes('<h2>'));
  assert.ok(es.translated_faq_json.length >= 3);
  assert.ok(es.translated_meta_title.length >= 30);
});

test('seed row builder produces 50 rows for mock source map', () => {
  const slugToMeta = new Map(
    RESOURCE_PILOT_SLUGS.map((slug, i) => [
      slug,
      {
        id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        title: `EN ${slug}`,
        meta_title: `Meta ${slug}`,
        meta_description: 'Desc',
        body_html: '<p>EN body</p>',
        faq: [],
        updated_at: '2026-05-21T00:00:00.000Z'
      }
    ])
  );
  const rows = buildResourcePilotSeedRows(slugToMeta);
  assert.equal(rows.length, 50);
  assert.equal(rows.every((r) => r.status === 'published'), true);
  assert.equal(rows.every((r) => (r.quality_score ?? 0) >= 85), true);
});

test('language switcher for pilot resource article paths', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/es/resources/avoid-scholarship-scams-targeting-families',
    currentLocale: 'es'
  });
  assert.equal(items.length, 3);
  assert.equal(
    items.some(
      (i) =>
        i.locale === 'en' &&
        i.href === '/resources/avoid-scholarship-scams-targeting-families'
    ),
    true
  );
  assert.equal(items.some((i) => i.href.includes('/en/')), false);
});

test('language switcher for any cms resource article slug', () => {
  const items = getStage2LanguageSwitcherItems({
    pathname: '/resources/journalism-scholarships-school-students-usa'
  });
  assert.equal(items.length, 3);
  assert.ok(items.some((i) => i.locale === 'es'));
  assert.ok(items.some((i) => i.locale === 'fr'));
});
