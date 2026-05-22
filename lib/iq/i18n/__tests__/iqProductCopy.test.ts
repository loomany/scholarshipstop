import assert from 'node:assert/strict';
import test from 'node:test';

import { getIqContextualFunnelCopy } from '@/lib/iq/i18n/iqContextualFunnelCopy';
import { getIqContextualStrategyCopy } from '@/lib/iq/i18n/iqContextualStrategyCopy';
import { getIqLegalMetadata, getIqLegalShellCopy } from '@/lib/iq/i18n/iqLegalShellCopy';
import { getIqFooterCopy } from '@/lib/iq/i18n/iqFooterCopy';
import { getIqFunnelEmailCopy } from '@/lib/iq/i18n/iqFunnelEmailCopy';
import { getIqLandingCopy } from '@/lib/iq/i18n/iqLandingCopy';
import {
  getIqAssessmentMetadata,
  getIqHomeMetadata
} from '@/lib/iq/i18n/iqMetadataCopy';
import { getIqPaywallCopy } from '@/lib/iq/i18n/iqPaywallCopy';
import { getIqReportCopy } from '@/lib/iq/i18n/iqReportCopy';
import { getIqLocalizedHref } from '@/lib/iq/i18n/iqLocalizedHref';

test('landing copy differs for ES and FR heroes', () => {
  const en = getIqLandingCopy('en');
  const es = getIqLandingCopy('es');
  assert.notEqual(en.hero.title, es.hero.title);
  assert.ok(es.hero.cta.includes('Iniciar'));
});

test('paywall and report copy localized', () => {
  const esPay = getIqPaywallCopy('es');
  const frReport = getIqReportCopy('fr');
  assert.ok(esPay.checkoutCta.includes('9,99'));
  assert.ok(frReport.title.includes('QI'));
});

test('footer links use locale prefixes on IQ host', () => {
  assert.equal(
    getIqLocalizedHref('/about', 'es', { onIqSubdomain: true }),
    '/es/about'
  );
  const footer = getIqFooterCopy('fr');
  assert.equal(footer.links.faq, 'FAQ');
});

test('metadata localized for home and assessment', () => {
  assert.ok(getIqHomeMetadata('es').title.includes('CI'));
  assert.ok(getIqAssessmentMetadata('fr').title.includes('QI'));
});

test('contextual funnel intents localized', () => {
  const es = getIqContextualFunnelCopy('es');
  assert.ok(es.intents.general_iq.title.length > 10);
  assert.ok(es.emailGate.continuePre.includes('CI'));
});

test('funnel email copy has ES strings', () => {
  const copy = getIqFunnelEmailCopy('es');
  assert.ok(copy.title.includes('perfil'));
});

test('contextual strategy and legal shell localized', () => {
  const es = getIqContextualStrategyCopy('es');
  assert.ok(es.recommendedGrants.includes('Becas'));
  const frReady = getIqContextualFunnelCopy('fr');
  assert.equal(frReady.iqReadyHighlights.length, 3);
  assert.ok(getIqLegalShellCopy('es').backToIq.includes('perfil'));
  assert.ok(getIqLegalMetadata('faq', 'fr').title.includes('QI'));
});
