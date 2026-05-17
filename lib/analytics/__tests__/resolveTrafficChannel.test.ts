import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getFirstTouchNotifySourceKey,
  resolveTrafficChannel
} from '@/lib/analytics/resolveTrafficChannel';

test('google.com search referrer -> search_google', () => {
  assert.equal(
    resolveTrafficChannel({
      landingUrl: 'https://example.com/page',
      referrer: 'https://www.google.com/search?q=scholarships',
      utm_source: '',
      utm_medium: '',
      utm_campaign: ''
    }),
    'search_google'
  );
});

test('google.ca search referrer -> search_google', () => {
  assert.equal(
    resolveTrafficChannel({
      landingUrl: 'https://example.com/page',
      referrer: 'https://www.google.ca/search?q=x',
      utm_source: '',
      utm_medium: '',
      utm_campaign: ''
    }),
    'search_google'
  );
});

test('google.de search referrer -> search_google', () => {
  assert.equal(
    resolveTrafficChannel({
      landingUrl: 'https://example.com/page',
      referrer: 'https://www.google.de/url?q=foo',
      utm_source: '',
      utm_medium: '',
      utm_campaign: ''
    }),
    'search_google'
  );
});

test('yandex.ru search referrer -> search_yandex', () => {
  assert.equal(
    resolveTrafficChannel({
      landingUrl: 'https://example.com/page',
      referrer: 'https://yandex.ru/search/?text=scholarships',
      utm_source: '',
      utm_medium: '',
      utm_campaign: ''
    }),
    'search_yandex'
  );
});

test('yandex search maps to yandex_search notify key', () => {
  assert.equal(
    getFirstTouchNotifySourceKey({
      traffic_channel: 'search_yandex',
      landing_url: 'https://scholarshiptop.com/',
      referrer: 'https://yandex.ru/search/?text=x'
    }),
    'yandex_search'
  );
});

test('google search maps to google_search notify key', () => {
  assert.equal(
    getFirstTouchNotifySourceKey({
      traffic_channel: 'search_google',
      landing_url: 'https://scholarshiptop.com/',
      referrer: 'https://www.google.com/search?q=x'
    }),
    'google_search'
  );
});

test('bing.com search referrer -> organic_search', () => {
  assert.equal(
    resolveTrafficChannel({
      landingUrl: 'https://example.com/page',
      referrer: 'https://www.bing.com/search?q=x',
      utm_source: '',
      utm_medium: '',
      utm_campaign: ''
    }),
    'organic_search'
  );
});

test('no referrer and no utm -> direct_unknown', () => {
  assert.equal(
    resolveTrafficChannel({
      landingUrl: 'https://scholarshiptop.com/path',
      referrer: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: ''
    }),
    'direct_unknown'
  );
});

test('gclid on landing -> google_ads', () => {
  assert.equal(
    resolveTrafficChannel({
      landingUrl: 'https://scholarshiptop.com/x?gclid=abc',
      referrer: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: ''
    }),
    'google_ads'
  );
});
