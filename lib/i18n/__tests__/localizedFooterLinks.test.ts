import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FOOTER_LINK_CANONICAL_PATHS,
  getFooterLinks
} from '@/lib/i18n/localizedFooterLinks';
import { getLocalizedPilotPage } from '@/lib/i18n/staticTranslations';

const EXPECTED_FOOTER_PATHS = [
  '/',
  '/about',
  '/how-scholarshiptop-works',
  '/scholarship-verification-methodology',
  '/how-we-rank-scholarships',
  '/editorial-policy',
  '/corrections',
  '/financial-aid-disclaimer',
  '/how-we-make-money',
  '/help',
  '/privacy-policy',
  '/terms',
  '/refund-policy',
  '/faq'
] as const;

test('footer registry matches English primary link set', () => {
  assert.deepEqual(FOOTER_LINK_CANONICAL_PATHS, [...EXPECTED_FOOTER_PATHS]);
});

test('English footer exposes full localized link set', () => {
  const links = getFooterLinks('en');
  assert.equal(links.length, EXPECTED_FOOTER_PATHS.length);
  assert.deepEqual(
    links.map((link) => link.canonicalPath),
    [...EXPECTED_FOOTER_PATHS]
  );
  assert.ok(links.every((link) => link.available));
  assert.ok(links.every((link) => !link.href.startsWith('/en')));
});

test('Spanish footer exposes full pilot links with /es prefix', () => {
  const links = getFooterLinks('es');
  assert.equal(links.length, EXPECTED_FOOTER_PATHS.length);
  assert.ok(
    links.every(
      (link) => link.href === `/es${link.canonicalPath === '/' ? '' : link.canonicalPath}`
    )
  );
  assert.ok(links.every((link) => link.label.length > 0));
  assert.equal(links.find((l) => l.canonicalPath === '/help')?.label, 'Ayuda');
  assert.equal(links.find((l) => l.canonicalPath === '/terms')?.href, '/es/terms');
});

test('French footer exposes full pilot links with /fr prefix', () => {
  const links = getFooterLinks('fr');
  assert.equal(links.length, EXPECTED_FOOTER_PATHS.length);
  assert.ok(
    links.every(
      (link) => link.href === `/fr${link.canonicalPath === '/' ? '' : link.canonicalPath}`
    )
  );
  assert.equal(
    links.find((l) => l.canonicalPath === '/faq')?.href,
    '/fr/faq'
  );
});

test('footer links never use /en or unsupported locale prefixes', () => {
  for (const locale of ['en', 'es', 'fr'] as const) {
    for (const link of getFooterLinks(locale)) {
      assert.equal(link.href.includes('/en/'), false);
      for (const bad of ['de', 'pt', 'ar', 'ru', 'vi', 'hi', 'id', 'zh-Hans']) {
        assert.equal(link.href.startsWith(`/${bad}`), false);
      }
    }
  }
});

test('translated static pages required by footer exist for es and fr', () => {
  for (const path of EXPECTED_FOOTER_PATHS) {
    assert.ok(getLocalizedPilotPage('es', path), `missing es page ${path}`);
    assert.ok(getLocalizedPilotPage('fr', path), `missing fr page ${path}`);
  }
});

test('footer does not include non-English-only extras like scam warning', () => {
  for (const locale of ['en', 'es', 'fr'] as const) {
    assert.equal(
      getFooterLinks(locale).some(
        (link) => link.canonicalPath === '/scholarship-scam-warning'
      ),
      false
    );
  }
});
